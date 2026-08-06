'use client';
import { C, alpha } from './tokens';

/**
 * Toman amounts, abbreviated once they stop being readable digit by digit.
 * The books screens show a lot of these side by side, so a nine-digit number
 * printed in full would wreck the column it sits in.
 */
export function toman(n: number, opts: { compact?: boolean } = {}): string {
  const v = Math.round(n || 0);
  if (!opts.compact) return v.toLocaleString('fa-IR');
  if (Math.abs(v) >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)} میلیارد`;
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} م`;
  if (Math.abs(v) >= 1_000) return `${Math.round(v / 1_000)} هـ`;
  return v.toLocaleString('fa-IR');
}

export function Money({ amount, compact, color, size = 14 }: {
  amount: number; compact?: boolean; color?: string; size?: number;
}) {
  return (
    <span style={{ fontWeight: 800, fontSize: size, color: color ?? C.text, whiteSpace: 'nowrap' }}>
      {toman(amount, { compact })}
      <span style={{ fontSize: size - 4, fontWeight: 600, color: C.muted, marginRight: 3 }}>ت</span>
    </span>
  );
}

const MONTH_NAMES = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
];

/** 'YYYY-MM' (Gregorian, as the API groups it) -> short Jalali month label. */
export function monthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return ym;
  const d = new Date(y, m - 1, 15);
  const parts = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { month: 'numeric', year: 'numeric' })
    .formatToParts(d);
  const jm = Number(parts.find((p) => p.type === 'month')?.value?.replace(/\D/g, '') ?? m);
  return MONTH_NAMES[(jm - 1 + 12) % 12] ?? ym;
}

/**
 * A compact two-series bar per month. Deliberately not a charting library —
 * the whole point is a glance at the trend, and a dependency for twelve
 * rectangles would cost more than it returns.
 */
export function MonthlyBars({ data, primaryLabel, secondaryLabel }: {
  data: { month: string; primary: number; secondary: number }[];
  primaryLabel: string;
  secondaryLabel: string;
}) {
  if (data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.primary), 1);

  return (
    <div>
      <div style={{ display: 'flex', gap: 14, marginBottom: 12 }}>
        {[[primaryLabel, C.green], [secondaryLabel, C.statusInfo]].map(([label, color]) => (
          <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: C.muted }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: color as string }} />
            {label}
          </span>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 110 }}>
        {data.map((d) => (
          <div key={d.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div
              style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 84, width: '100%', justifyContent: 'center' }}
              title={`${monthLabel(d.month)} — ${primaryLabel}: ${toman(d.primary)} · ${secondaryLabel}: ${toman(d.secondary)}`}
            >
              <div style={{
                width: 11, borderRadius: '4px 4px 0 0',
                height: `${Math.max(3, (d.primary / max) * 84)}px`,
                background: C.green,
              }} />
              <div style={{
                width: 11, borderRadius: '4px 4px 0 0',
                height: `${Math.max(3, (d.secondary / max) * 84)}px`,
                background: alpha(C.statusInfo, 70),
              }} />
            </div>
            <span style={{ fontSize: 9.5, color: C.subtle, whiteSpace: 'nowrap' }}>{monthLabel(d.month)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
