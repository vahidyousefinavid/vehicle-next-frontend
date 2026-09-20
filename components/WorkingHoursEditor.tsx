'use client';
import { useMemo } from 'react';
import { C, alpha } from './ui';
import { CheckIcon, ClockIcon, PlusIcon, XIcon } from './icons';
import {
  DAY_NAMES, PRESETS, type WorkingHours, type DayPlan,
  cloneWeek, emptyWeek, fa, matchPreset, minutesOf,
} from '@/lib/workingHours';

/* Quarter-hour steps: shop hours are never 14:07, and 96 options per field is
   already the most a phone select should carry. */
const TIMES = Array.from({ length: 24 * 4 }, (_, i) => {
  const h = Math.floor(i / 4), m = (i % 4) * 15;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
});

function TimeSelect({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        minHeight: 40, borderRadius: 10, padding: '0 8px',
        background: C.fill2, color: C.text, border: `1px solid ${C.border}`,
        fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 700,
        fontVariantNumeric: 'tabular-nums', cursor: 'pointer',
      }}
    >
      {TIMES.map((t) => <option key={t} value={t}>{fa(t)}</option>)}
    </select>
  );
}

/**
 * ساعت کاری picker.
 *
 * A preset sets the whole week in one tap, which is what almost everybody
 * wants; the day rows are for the one day that differs. Without the presets
 * this is fourteen time fields to say "nine to six, closed Friday", and it
 * simply would not get filled in.
 */
export default function WorkingHoursEditor({
  value, onChange,
}: {
  value: WorkingHours | null;
  onChange: (v: WorkingHours | null) => void;
}) {
  const week = value ?? emptyWeek();
  const activePreset = useMemo(() => matchPreset(value), [value]);

  const mutate = (fn: (w: WorkingHours) => void) => {
    const next = cloneWeek(week);
    fn(next);
    // a week with nothing open is not a schedule; store it as "not set"
    onChange(next.days.some((d) => !d.closed) ? next : null);
  };

  const setDay = (i: number, plan: DayPlan) => mutate((w) => { w.days[i] = plan; });

  const toggleClosed = (i: number) => {
    const d = week.days[i];
    setDay(i, d.closed
      ? { closed: false, intervals: [{ from: '09:00', to: '18:00' }] }
      : { closed: true, intervals: [] });
  };

  const setTime = (i: number, ivIdx: number, field: 'from' | 'to', v: string) =>
    mutate((w) => {
      const iv = w.days[i].intervals[ivIdx];
      iv[field] = v;
      // keep the pair sane as it is edited rather than refusing it afterwards
      if (minutesOf(iv.to) <= minutesOf(iv.from)) {
        const step = TIMES.indexOf(iv.from);
        if (field === 'from') iv.to = TIMES[Math.min(step + 4, TIMES.length - 1)];
        else iv.from = TIMES[Math.max(TIMES.indexOf(iv.to) - 4, 0)];
      }
    });

  const addInterval = (i: number) =>
    mutate((w) => {
      const d = w.days[i];
      const last = d.intervals[d.intervals.length - 1];
      const start = last ? TIMES[Math.min(TIMES.indexOf(last.to) + 8, TIMES.length - 5)] : '16:00';
      d.intervals.push({ from: start, to: TIMES[Math.min(TIMES.indexOf(start) + 16, TIMES.length - 1)] });
    });

  const removeInterval = (i: number, ivIdx: number) =>
    mutate((w) => {
      w.days[i].intervals.splice(ivIdx, 1);
      if (!w.days[i].intervals.length) w.days[i] = { closed: true, intervals: [] };
    });

  /** «بقیهٔ روزها هم همین» — the other thing everybody wants after a tweak. */
  const copyToAll = (i: number) =>
    mutate((w) => {
      const src = w.days[i];
      for (let d = 0; d < 7; d++) {
        if (d === i) continue;
        // Friday stays as it is: copying over a deliberate closure is worse
        // than making someone set six days, and جمعه is the usual closure
        if (d === 6 && w.days[6].closed) continue;
        w.days[d] = { closed: src.closed, intervals: src.intervals.map((x) => ({ ...x })) };
      }
    });

  return (
    <div className="wh">
      <div className="wh-presets">
        {PRESETS.map((p) => {
          const on = activePreset === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onChange(p.build())}
              aria-pressed={on}
              className="wh-preset"
              style={{
                background: on ? alpha(C.green, 12) : C.surfaceSolid,
                borderColor: on ? alpha(C.green, 45) : C.border,
                color: C.text,
              }}
            >
              <span className="wh-preset-head">
                {on ? <CheckIcon size={13} /> : <ClockIcon size={13} />}
                <b style={{ color: on ? C.green : C.textStrong }}>{p.label}</b>
              </span>
              <small style={{ color: C.muted }}>{p.detail}</small>
            </button>
          );
        })}
      </div>

      <div className="wh-days">
        {week.days.map((d, i) => (
          <div key={i} className="wh-day" style={{ borderColor: C.border }}>
            <div className="wh-day-head">
              <button
                type="button"
                onClick={() => toggleClosed(i)}
                className="wh-toggle"
                aria-pressed={!d.closed}
                style={{
                  background: d.closed ? C.fill2 : alpha(C.statusOk, 12),
                  color: d.closed ? C.muted : C.statusOk,
                  border: `1px solid ${d.closed ? C.border : alpha(C.statusOk, 30)}`,
                }}
              >
                {d.closed ? 'تعطیل' : 'باز'}
              </button>
              <b style={{ color: C.text }}>{DAY_NAMES[i]}</b>
              {!d.closed && (
                <button type="button" onClick={() => copyToAll(i)} className="wh-copy" style={{ color: C.green }}>
                  بقیه هم همین
                </button>
              )}
            </div>

            {!d.closed && (
              <div className="wh-intervals">
                {d.intervals.map((iv, k) => (
                  <div key={k} className="wh-iv">
                    <TimeSelect label={`${DAY_NAMES[i]} از`} value={iv.from} onChange={(v) => setTime(i, k, 'from', v)} />
                    <span style={{ color: C.muted, fontSize: 12 }}>تا</span>
                    <TimeSelect label={`${DAY_NAMES[i]} تا`} value={iv.to} onChange={(v) => setTime(i, k, 'to', v)} />
                    {d.intervals.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeInterval(i, k)}
                        aria-label="حذف این بازه"
                        className="wh-rm tap44"
                        style={{ color: C.muted, background: C.fill2 }}
                      >
                        <XIcon size={13} />
                      </button>
                    )}
                  </div>
                ))}
                {d.intervals.length < 2 && (
                  <button type="button" onClick={() => addInterval(i)} className="wh-add" style={{ color: C.green }}>
                    <PlusIcon size={13} />شیفت دوم
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <style jsx>{`
        .wh{display:grid;gap:14px}
        .wh-presets{display:grid;gap:8px}
        @media(min-width:560px){ .wh-presets{grid-template-columns:1fr 1fr} }
        .wh-preset{
          text-align:start;border-radius:14px;border:1px solid;padding:11px 12px;
          display:grid;gap:3px;cursor:pointer;font-family:var(--font-sans);
          transition:background var(--dur-move,220ms) var(--ease-soft,ease),border-color var(--dur-move,220ms) var(--ease-soft,ease);
        }
        .wh-preset:active{transform:scale(.99)}
        .wh-preset-head{display:flex;align-items:center;gap:6px}
        .wh-preset-head b{font-size:13px;font-weight:800;line-height:1.4}
        .wh-preset small{font-size:11px;line-height:1.5}
        .wh-days{display:grid;gap:8px}
        .wh-day{border:1px solid;border-radius:14px;padding:10px 11px;display:grid;gap:9px}
        .wh-day-head{display:flex;align-items:center;gap:9px}
        .wh-day-head b{font-size:13.5px;font-weight:800;flex:1;min-width:0}
        .wh-toggle{
          min-width:58px;min-height:32px;border-radius:9px;font-family:var(--font-sans);
          font-size:11.5px;font-weight:900;cursor:pointer;
        }
        .wh-copy{
          background:none;border:0;font-family:var(--font-sans);font-size:11.5px;
          font-weight:800;cursor:pointer;padding:6px 2px;
        }
        .wh-intervals{display:grid;gap:7px}
        .wh-iv{display:flex;align-items:center;gap:7px;flex-wrap:wrap}
        .wh-rm{width:32px;height:32px;border:0;border-radius:9px;display:grid;place-items:center;cursor:pointer}
        .wh-add{
          justify-self:start;background:none;border:0;display:flex;align-items:center;gap:5px;
          font-family:var(--font-sans);font-size:12px;font-weight:800;cursor:pointer;padding:6px 2px;
        }
        @media (prefers-reduced-motion: reduce){ .wh-preset:active{transform:none} }
      `}</style>
    </div>
  );
}
