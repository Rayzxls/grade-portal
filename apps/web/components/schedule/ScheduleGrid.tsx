'use client';

import { useMemo } from 'react';
import {
  DAYS,
  type ScheduleSettings,
  type SchedulePeriod,
  minutesToHHMM,
} from './types';

const COL_WIDTH = 110; // px per period column
const DAY_COL_WIDTH = 80;
const SPECIAL_COL_WIDTH = 90;
const ROW_HEIGHT = 92;

interface Props {
  settings: ScheduleSettings;
  periods: SchedulePeriod[];
  onCellClick: (dayOfWeek: number, startMinutes: number) => void;
  onBlockClick: (period: SchedulePeriod) => void;
  onSpecialClick: (dayOfWeek: number) => void;
}

export function ScheduleGrid({ settings, periods, onCellClick, onBlockClick, onSpecialClick }: Props) {
  const { startHour, endHour, periodMinutes, showSaturday, showSunday, specialColLabel, specialColColor } = settings;

  const visibleDays = useMemo(
    () => DAYS.filter((d) => (d.day === 6 ? showSaturday : d.day === 7 ? showSunday : true)),
    [showSaturday, showSunday],
  );

  const totalMinutes = (endHour - startHour) * 60;
  const periodCount = Math.ceil(totalMinutes / periodMinutes);
  const periodCols = Array.from({ length: periodCount }, (_, i) => ({
    index: i + 1,
    startMin: startHour * 60 + i * periodMinutes,
    endMin: startHour * 60 + (i + 1) * periodMinutes,
  }));

  const gridWidth = DAY_COL_WIDTH + SPECIAL_COL_WIDTH + periodCount * COL_WIDTH;

  // Group periods by day for absolute positioning
  const periodsByDay = useMemo(() => {
    const map = new Map<number, SchedulePeriod[]>();
    for (const d of visibleDays) map.set(d.day, []);
    for (const p of periods) {
      if (p.kind === 'SPECIAL') continue; // handled separately
      const arr = map.get(p.dayOfWeek);
      if (arr) arr.push(p);
    }
    return map;
  }, [periods, visibleDays]);

  const specialByDay = useMemo(() => {
    const map = new Map<number, SchedulePeriod | null>();
    for (const d of visibleDays) map.set(d.day, null);
    for (const p of periods) {
      if (p.kind === 'SPECIAL') map.set(p.dayOfWeek, p);
    }
    return map;
  }, [periods, visibleDays]);

  function minToX(min: number): number {
    return ((min - startHour * 60) / periodMinutes) * COL_WIDTH;
  }

  function handleCellClick(e: React.MouseEvent<HTMLDivElement>, day: number) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    // snap to 15 min
    const snapPx = COL_WIDTH / (periodMinutes / 15);
    const snappedX = Math.floor(x / snapPx) * snapPx;
    const min = startHour * 60 + Math.round((snappedX / COL_WIDTH) * periodMinutes);
    onCellClick(day, min);
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <div style={{ width: gridWidth, minWidth: '100%' }}>
        {/* Header row: period numbers + time */}
        <div className="flex border-b border-slate-200 bg-slate-50 sticky top-0 z-20">
          <div
            style={{ width: DAY_COL_WIDTH }}
            className="flex-shrink-0 px-3 py-2 text-xs font-semibold text-ink-soft border-r border-slate-200"
          >
            วัน / คาบ
          </div>
          <div
            style={{ width: SPECIAL_COL_WIDTH }}
            className="flex-shrink-0 flex flex-col items-center justify-center px-1 py-2 border-r border-slate-200"
          >
            <div className="text-[11px] font-bold text-amber-700 truncate w-full text-center" title={specialColLabel}>
              {specialColLabel}
            </div>
            <div className="text-[10px] text-ink-soft mt-0.5">
              {String(startHour).padStart(2, '0')}.00–{String(startHour + 1).padStart(2, '0')}.00
            </div>
          </div>
          {periodCols.map((c) => (
            <div
              key={c.index}
              style={{ width: COL_WIDTH }}
              className="flex-shrink-0 flex flex-col items-center justify-center px-1 py-2 border-r border-slate-200 last:border-r-0"
            >
              <div className="text-sm font-bold text-ink">{c.index}</div>
              <div className="text-[10px] text-ink-soft mt-0.5 font-mono">
                {String(Math.floor(c.startMin / 60)).padStart(2, '0')}.{String(c.startMin % 60).padStart(2, '0')}–
                {String(Math.floor(c.endMin / 60)).padStart(2, '0')}.{String(c.endMin % 60).padStart(2, '0')}
              </div>
            </div>
          ))}
        </div>

        {/* Day rows */}
        {visibleDays.map((day) => {
          const dayPeriods = periodsByDay.get(day.day) ?? [];
          const special = specialByDay.get(day.day);
          return (
            <div
              key={day.day}
              className="flex border-b border-slate-200 last:border-b-0 hover:bg-slate-50/30"
              style={{ height: ROW_HEIGHT }}
            >
              {/* Day label */}
              <div
                style={{ width: DAY_COL_WIDTH }}
                className="flex-shrink-0 flex items-center justify-center px-3 border-r border-slate-200 bg-slate-50/50 font-semibold text-ink text-sm sticky left-0 z-10"
              >
                {day.label}
              </div>

              {/* Special column */}
              <div
                style={{ width: SPECIAL_COL_WIDTH, backgroundColor: specialColColor }}
                className="flex-shrink-0 flex items-center justify-center border-r border-slate-200 cursor-pointer hover:brightness-95 transition-all"
                onClick={() => (special ? onBlockClick(special) : onSpecialClick(day.day))}
                title={special ? 'คลิกเพื่อแก้ไข' : 'คลิกเพื่อเพิ่มกิจกรรม'}
              >
                {special ? (
                  <div className="text-[11px] font-semibold text-amber-900 text-center px-1 leading-tight">
                    {special.title ?? specialColLabel}
                  </div>
                ) : (
                  <div className="text-[11px] font-semibold text-amber-800 text-center px-1 leading-tight opacity-80">
                    {specialColLabel}
                  </div>
                )}
              </div>

              {/* Periods area (absolute positioned blocks) */}
              <div
                className="relative flex-1 cursor-pointer"
                style={{ width: periodCount * COL_WIDTH }}
                onClick={(e) => handleCellClick(e, day.day)}
              >
                {/* Grid background lines */}
                <div className="absolute inset-0 flex pointer-events-none">
                  {periodCols.map((c) => (
                    <div
                      key={c.index}
                      style={{ width: COL_WIDTH }}
                      className="flex-shrink-0 border-r border-slate-200 last:border-r-0"
                    />
                  ))}
                </div>

                {/* Period blocks */}
                {dayPeriods.map((p) => {
                  const left = minToX(p.startMinutes);
                  const width = minToX(p.endMinutes) - minToX(p.startMinutes);
                  const durationMin = p.endMinutes - p.startMinutes;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onBlockClick(p);
                      }}
                      className="absolute top-1.5 bottom-1.5 rounded-lg border-2 px-2 py-1.5 text-left overflow-hidden transition-all duration-150 hover:shadow-md hover:brightness-105 hover:z-10 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                      style={{
                        left: left + 2,
                        width: width - 4,
                        backgroundColor: p.color,
                        borderColor: shade(p.color, -15),
                      }}
                      title={tooltipFor(p)}
                    >
                      <BlockContent period={p} widthPx={width} durationMin={durationMin} />
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BlockContent({
  period,
  widthPx,
  durationMin,
}: {
  period: SchedulePeriod;
  widthPx: number;
  durationMin: number;
}) {
  const code = period.subject?.code ?? period.title ?? 'คาบสอน';
  const classLabel = period.classroom
    ? `${period.classroom.gradeLevel}/${period.classroom.section}`
    : '';
  const room = period.room ? `(${period.room})` : '';

  // size variants
  if (widthPx < 70) {
    return (
      <div className="text-[10px] font-bold text-slate-800 truncate leading-tight">
        {code}
      </div>
    );
  }
  if (durationMin < 50 || widthPx < 120) {
    return (
      <div className="flex flex-col h-full justify-between">
        <div className="text-xs font-bold text-slate-800 truncate font-mono">{code}</div>
        <div className="text-[10px] text-slate-600 truncate">
          {room} {classLabel}
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col h-full justify-between">
      <div className="text-sm font-bold text-slate-800 truncate font-mono leading-tight">{code}</div>
      <div className="flex items-end justify-between gap-1 mt-0.5">
        <span className="text-[11px] text-slate-700 truncate">{room}</span>
        <span className="text-[11px] font-semibold text-slate-700 truncate text-right">{classLabel}</span>
      </div>
    </div>
  );
}

function tooltipFor(p: SchedulePeriod): string {
  const lines: string[] = [];
  if (p.subject) lines.push(`${p.subject.code} — ${p.subject.name}`);
  else if (p.title) lines.push(p.title);
  if (p.classroom) lines.push(`ห้องเรียน: ${p.classroom.gradeLevel}/${p.classroom.section}`);
  if (p.room) lines.push(`ห้อง: ${p.room}`);
  lines.push(`เวลา: ${minutesToHHMM(p.startMinutes)}–${minutesToHHMM(p.endMinutes)}`);
  if (p.note) lines.push(`📝 ${p.note}`);
  return lines.join('\n');
}

// shade hex color (positive = lighter, negative = darker)
function shade(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + Math.round((255 * percent) / 100)));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + Math.round((255 * percent) / 100)));
  const b = Math.max(0, Math.min(255, (num & 0xff) + Math.round((255 * percent) / 100)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
