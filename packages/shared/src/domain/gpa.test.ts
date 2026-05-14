import { describe, it, expect } from 'vitest';
import { scoreToLetter, calculateGpa, letterToGradePoint } from './gpa';

describe('scoreToLetter', () => {
  it.each([
    [85, 'A'],
    [80, 'A'],
    [75, 'B_PLUS'],
    [70, 'B'],
    [60, 'C'],
    [50, 'D'],
    [49, 'F'],
    [0, 'F'],
  ])('should return %s for score %i', (score, expected) => {
    expect(scoreToLetter(score)).toBe(expected);
  });

  it('should throw when score out of range', () => {
    expect(() => scoreToLetter(101)).toThrow();
    expect(() => scoreToLetter(-1)).toThrow();
  });
});

describe('calculateGpa', () => {
  it('should return 0 when no credits', () => {
    expect(calculateGpa([])).toBe(0);
  });

  it('should compute weighted GPA correctly', () => {
    const gpa = calculateGpa([
      { credits: 3, letter: 'A' },       // 4.0 * 3 = 12
      { credits: 3, letter: 'B' },       // 3.0 * 3 = 9
      { credits: 2, letter: 'C' },       // 2.0 * 2 = 4
    ]);
    // (12+9+4) / 8 = 3.125
    expect(gpa).toBe(3.13);
  });

  it('should skip W and I grades', () => {
    const gpa = calculateGpa([
      { credits: 3, letter: 'A' },
      { credits: 3, letter: 'W' },
      { credits: 3, letter: 'I' },
    ]);
    expect(gpa).toBe(4.0);
  });
});

describe('letterToGradePoint', () => {
  it('should return null for W and I', () => {
    expect(letterToGradePoint('W')).toBeNull();
    expect(letterToGradePoint('I')).toBeNull();
  });
});
