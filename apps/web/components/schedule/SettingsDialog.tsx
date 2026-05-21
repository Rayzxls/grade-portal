'use client';

import { useEffect, useState } from 'react';
import type { ScheduleSettings } from './types';

interface Props {
  open: boolean;
  settings: ScheduleSettings;
  onClose: () => void;
  onSave: (patch: Partial<ScheduleSettings>) => Promise<void>;
}

export function SettingsDialog({ open, settings, onClose, onSave }: Props) {
  const [s, setS] = useState(settings);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setS(settings);
  }, [open, settings]);

  if (!open) return null;

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({
        startHour: s.startHour,
        endHour: s.endHour,
        periodMinutes: s.periodMinutes,
        showSaturday: s.showSaturday,
        showSunday: s.showSunday,
        specialColLabel: s.specialColLabel,
        specialColColor: s.specialColColor,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-fade-in p-4">
      <div className="card w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold tracking-tight text-ink">⚙️ ตั้งค่าตารางสอน</h3>
          <button onClick={onClose} className="text-ink-soft hover:text-ink text-xl leading-none">×</button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <F label="เริ่มเวลา (โมง)">
            <input
              type="number"
              min={0}
              max={23}
              value={s.startHour}
              onChange={(e) => setS({ ...s, startHour: Number(e.target.value) })}
              className="input"
            />
          </F>
          <F label="สิ้นสุด (โมง)">
            <input
              type="number"
              min={1}
              max={24}
              value={s.endHour}
              onChange={(e) => setS({ ...s, endHour: Number(e.target.value) })}
              className="input"
            />
          </F>
        </div>

        <F label="ความยาว 1 คาบ (นาที)">
          <select
            value={s.periodMinutes}
            onChange={(e) => setS({ ...s, periodMinutes: Number(e.target.value) })}
            className="input"
          >
            <option value={45}>45 นาที</option>
            <option value={50}>50 นาที</option>
            <option value={55}>55 นาที</option>
            <option value={60}>60 นาที (1 ชั่วโมง)</option>
          </select>
        </F>

        <F label="ชื่อคอลัมน์พิเศษ (ซ้ายสุด)">
          <input
            value={s.specialColLabel}
            onChange={(e) => setS({ ...s, specialColLabel: e.target.value })}
            className="input"
            maxLength={50}
          />
        </F>

        <div className="flex gap-4 mb-4 mt-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={s.showSaturday}
              onChange={(e) => setS({ ...s, showSaturday: e.target.checked })}
            />
            แสดงวันเสาร์
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={s.showSunday}
              onChange={(e) => setS({ ...s, showSunday: e.target.checked })}
            />
            แสดงวันอาทิตย์
          </label>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} disabled={saving} className="btn-secondary btn-sm">ยกเลิก</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary btn-sm">
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>
      </div>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <label className="block text-xs font-semibold text-ink-soft mb-1.5">{label}</label>
      {children}
    </div>
  );
}
