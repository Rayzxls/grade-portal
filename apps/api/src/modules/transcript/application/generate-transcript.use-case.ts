import { Injectable, NotFoundException } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { calculateGpa } from '@grade/shared';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

const LETTER_LABEL: Record<string, string> = {
  A: 'A', B_PLUS: 'B+', B: 'B', C_PLUS: 'C+', C: 'C',
  D_PLUS: 'D+', D: 'D', F: 'F', W: 'W', I: 'I',
};

@Injectable()
export class GenerateTranscriptUseCase {
  constructor(private prisma: PrismaService) {}

  async execute(userId: string): Promise<Buffer> {
    const student = await this.prisma.student.findUnique({
      where: { userId },
      include: { user: true },
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
    const totalCredits = grades.reduce((s, g) => s + g.enrollment.course.credits, 0);

    return new Promise<Buffer>((resolve) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // Header
      doc.fontSize(18).text('OFFICIAL TRANSCRIPT', { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(10).fillColor('#666').text('Student Grade Portal', { align: 'center' });
      doc.fillColor('black');
      doc.moveDown(1.5);

      // Student info
      doc.fontSize(11);
      doc.text(`Student ID:   ${student.studentCode}`);
      doc.text(`Name:         ${student.user.fullName}`);
      doc.text(`Faculty:      ${student.faculty}`);
      doc.text(`Major:        ${student.major}`);
      doc.text(`Enroll Year:  ${student.enrollYear}`);
      doc.moveDown(1);

      // Table header
      const startY = doc.y;
      doc.font('Helvetica-Bold').fontSize(10);
      doc.text('Code', 50, startY);
      doc.text('Course', 130, startY);
      doc.text('Cr.', 340, startY, { width: 30, align: 'right' });
      doc.text('Score', 380, startY, { width: 50, align: 'right' });
      doc.text('Grade', 440, startY, { width: 60, align: 'right' });
      doc.text('Term', 510, startY, { width: 60, align: 'right' });
      doc.font('Helvetica');
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
      doc.font('Helvetica-Bold').fontSize(11);
      doc.text(`Total Credits:  ${totalCredits}`);
      doc.text(`GPAX:           ${gpa.toFixed(2)}`);
      doc.font('Helvetica').fontSize(9).fillColor('#666');
      doc.moveDown(2);
      doc.text(`Generated at: ${new Date().toISOString()}`, { align: 'right' });

      doc.end();
    });
  }
}
