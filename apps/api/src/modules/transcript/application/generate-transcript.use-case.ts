import { Injectable, NotFoundException } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { calculateGpa } from '@grade/shared';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

const LETTER_LABEL: Record<string, string> = {
  A: 'A', B_PLUS: 'B+', B: 'B', C_PLUS: 'C+', C: 'C',
  D_PLUS: 'D+', D: 'D', F: 'F', W: 'W', I: 'I',
};

async function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download file: ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

async function resolveFonts(): Promise<{ regular: string; bold: string }> {
  const rootDir = path.join(__dirname, '..', '..', '..', '..');
  const assetsDir = path.join(rootDir, 'src', 'assets', 'fonts');
  const localRegular = path.join(assetsDir, 'Sarabun-Regular.ttf');
  const localBold = path.join(assetsDir, 'Sarabun-Bold.ttf');

  // 1. Check local assets folder
  if (fs.existsSync(localRegular) && fs.existsSync(localBold)) {
    return { regular: localRegular, bold: localBold };
  }

  // 2. Check standard Windows Tahoma paths
  const winRegular = 'C:\\Windows\\Fonts\\tahoma.ttf';
  const winBold = 'C:\\Windows\\Fonts\\tahomabd.ttf';
  if (fs.existsSync(winRegular) && fs.existsSync(winBold)) {
    return { regular: winRegular, bold: winBold };
  }

  // 3. Check macOS Tahoma paths
  const macRegular = '/System/Library/Fonts/Supplemental/Tahoma.ttf';
  const macBold = '/System/Library/Fonts/Supplemental/Tahoma Bold.ttf';
  if (fs.existsSync(macRegular) && fs.existsSync(macBold)) {
    return { regular: macRegular, bold: macBold };
  }

  // 4. Download Google Sarabun font if not found anywhere else
  try {
    fs.mkdirSync(assetsDir, { recursive: true });
    const regularUrl = 'https://raw.githubusercontent.com/google/fonts/main/ofl/sarabun/Sarabun-Regular.ttf';
    const boldUrl = 'https://raw.githubusercontent.com/google/fonts/main/ofl/sarabun/Sarabun-Bold.ttf';
    await Promise.all([
      downloadFile(regularUrl, localRegular),
      downloadFile(boldUrl, localBold),
    ]);
    return { regular: localRegular, bold: localBold };
  } catch (err) {
    console.error('Failed to download Thai fonts, falling back to Helvetica', err);
    return { regular: 'Helvetica', bold: 'Helvetica-Bold' };
  }
}

@Injectable()
export class GenerateTranscriptUseCase {
  constructor(private prisma: PrismaService) {}

  async execute(userId: string): Promise<Buffer> {
    const student = await this.prisma.student.findUnique({
      where: { userId },
      include: { user: true, classroom: true },
    });
    if (!student) throw new NotFoundException('ไม่พบโปรไฟล์นักเรียน');

    const grades = await this.prisma.grade.findMany({
      where: { studentId: student.id },
      include: { enrollment: { include: { course: true, term: true } } },
      orderBy: [{ enrollment: { term: { year: 'asc' } } }, { enrollment: { term: { semester: 'asc' } } }],
    });

    const gpa = calculateGpa(
      grades.map((g) => ({
        credits: g.enrollment.course.credits,
        letter: g.letter as Parameters<typeof calculateGpa>[0][number]['letter'],
      })),
    );
    const totalCredits = grades.reduce((s, g) => {
      if (g.letter === 'W' || g.letter === 'I') return s;
      return s + g.enrollment.course.credits;
    }, 0);

    const fonts = await resolveFonts();
    const fontRegular = fonts.regular.endsWith('.ttf') ? 'ThaiFont' : 'Helvetica';
    const fontBold = fonts.bold.endsWith('.ttf') ? 'ThaiFont-Bold' : 'Helvetica-Bold';

    return new Promise<Buffer>((resolve) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      if (fonts.regular.endsWith('.ttf')) {
        doc.registerFont('ThaiFont', fonts.regular);
      }
      if (fonts.bold.endsWith('.ttf')) {
        doc.registerFont('ThaiFont-Bold', fonts.bold);
      }

      // Header
      doc.font(fontBold).fontSize(18).text('OFFICIAL TRANSCRIPT', { align: 'center' });
      doc.moveDown(0.3);
      doc.font(fontRegular).fontSize(10).fillColor('#666').text('Student Grade Portal', { align: 'center' });
      doc.fillColor('black');
      doc.moveDown(1.5);

      // Student info
      doc.fontSize(11);
      doc.text(`Student ID:   ${student.studentCode}`);
      doc.text(`Name:         ${student.user.fullName}`);
      doc.text(
        `Classroom:    ${
          student.classroom
            ? `${student.classroom.gradeLevel}/${student.classroom.section} (${student.classroom.academicYear})`
            : '-'
        }`,
      );
      doc.text(`Enroll Year:  ${student.enrollYear}`);
      doc.moveDown(1);

      // Table header
      const startY = doc.y;
      doc.font(fontBold).fontSize(10);
      doc.text('Code', 50, startY);
      doc.text('Course', 130, startY);
      doc.text('Cr.', 340, startY, { width: 30, align: 'right' });
      doc.text('Score', 380, startY, { width: 50, align: 'right' });
      doc.text('Grade', 440, startY, { width: 60, align: 'right' });
      doc.text('Term', 510, startY, { width: 60, align: 'right' });
      doc.font(fontRegular);
      doc.moveTo(50, doc.y + 2).lineTo(560, doc.y + 2).stroke();
      doc.moveDown(0.5);

      // Rows
      for (const g of grades) {
        const y = doc.y;
        doc.fontSize(10);
        doc.text(g.enrollment.course.code, 50, y, { width: 80 });
        doc.text(g.enrollment.course.name, 130, y, { width: 200 });
        doc.text(String(g.enrollment.course.credits), 340, y, { width: 30, align: 'right' });
        doc.text(String(g.score), 380, y, { width: 50, align: 'right' });
        doc.text(LETTER_LABEL[g.letter] ?? g.letter, 440, y, { width: 60, align: 'right' });
        doc.text(`${g.enrollment.term.year}/${g.enrollment.term.semester[0]}`, 510, y, { width: 60, align: 'right' });
        doc.moveDown(0.6);
      }

      doc.moveTo(50, doc.y + 2).lineTo(560, doc.y + 2).stroke();
      doc.moveDown(1);

      // Summary
      doc.font(fontBold).fontSize(11);
      doc.text(`Total Credits:  ${totalCredits}`);
      doc.text(`GPAX:           ${gpa.toFixed(2)}`);
      doc.font(fontRegular).fontSize(9).fillColor('#666');
      doc.moveDown(2);
      doc.text(`Generated at: ${new Date().toISOString()}`, { align: 'right' });

      doc.end();
    });
  }
}
