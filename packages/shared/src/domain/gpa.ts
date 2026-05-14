import type { GradeLetter } from '../types/role';

/**
 * แปลงคะแนน 0-100 เป็นเกรดตัวอักษร (Standard Thai University)
 */
export function scoreToLetter(score: number): GradeLetter {
  if (score < 0 || score > 100) throw new Error('Score out of range');
  if (score >= 80) return 'A';
  if (score >= 75) return 'B_PLUS';
  if (score >= 70) return 'B';
  if (score >= 65) return 'C_PLUS';
  if (score >= 60) return 'C';
  if (score >= 55) return 'D_PLUS';
  if (score >= 50) return 'D';
  return 'F';
}

const GRADE_POINTS: Record<GradeLetter, number | null> = {
  A: 4.0,
  B_PLUS: 3.5,
  B: 3.0,
  C_PLUS: 2.5,
  C: 2.0,
  D_PLUS: 1.5,
  D: 1.0,
  F: 0.0,
  W: null, // ไม่นับใน GPA
  I: null,
};

export function letterToGradePoint(letter: GradeLetter): number | null {
  return GRADE_POINTS[letter];
}

export interface GpaInput {
  credits: number;
  letter: GradeLetter;
}

/**
 * คำนวณ GPA จากรายวิชาที่เรียน (ละเว้นวิชา W, I)
 */
export function calculateGpa(entries: GpaInput[]): number {
  let totalPoints = 0;
  let totalCredits = 0;

  for (const e of entries) {
    const point = letterToGradePoint(e.letter);
    if (point === null) continue;
    totalPoints += point * e.credits;
    totalCredits += e.credits;
  }

  if (totalCredits === 0) return 0;
  return Math.round((totalPoints / totalCredits) * 100) / 100;
}
