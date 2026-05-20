export function formatTerm(year: number, semester: string): string {
  const semLabel =
    semester === 'FIRST' || semester === 'F'
      ? 'ภาคเรียนที่ 1'
      : semester === 'SECOND' || semester === 'S'
        ? 'ภาคเรียนที่ 2'
        : semester === 'SUMMER'
          ? 'ภาคเรียนฤดูร้อน (Summer)'
          : semester;
  return `${semLabel} (ปีการศึกษา ${year})`;
}
