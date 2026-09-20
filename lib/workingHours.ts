'use client';

/**
 * ساعت کاری — the client half.
 *
 * Mirrors the server's shape (src/users/working-hours.ts): seven days from
 * شنبه, each closed or carrying one or two intervals. Two, because the split
 * shift is how most workshops here really work — one open/close pair would
 * make them claim they are open through the lunch break.
 */

export interface Interval { from: string; to: string }
export interface DayPlan { closed: boolean; intervals: Interval[] }
export interface WorkingHours { days: DayPlan[] }

/** index 0 = شنبه, matching the server */
export const DAY_NAMES = ['شنبه', 'یک‌شنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'];
export const DAY_SHORT = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

export const fa = (s: string | number) => String(s).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d]);

export const minutesOf = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

const closed = (): DayPlan => ({ closed: true, intervals: [] });
const open = (...iv: [string, string][]): DayPlan => ({
  closed: false,
  intervals: iv.map(([from, to]) => ({ from, to })),
});

export const emptyWeek = (): WorkingHours => ({ days: Array.from({ length: 7 }, closed) });

export const cloneWeek = (w: WorkingHours): WorkingHours => ({
  days: w.days.map((d) => ({ closed: d.closed, intervals: d.intervals.map((i) => ({ ...i })) })),
});

/**
 * بازه‌های آماده — the whole point of which is that nobody should have to fill
 * in fourteen time fields to say "nine to six, closed Friday". Pick one, then
 * change the day that is different.
 */
export const PRESETS: { id: string; label: string; detail: string; build: () => WorkingHours }[] = [
  {
    id: 'standard',
    label: 'شنبه تا پنج‌شنبه، ۹ تا ۱۸',
    detail: 'جمعه تعطیل',
    build: () => ({ days: [...Array(6).fill(null).map(() => open(['09:00', '18:00'])), closed()] }),
  },
  {
    id: 'two-shift',
    label: 'دو شیفت، ۸ تا ۱۳ و ۱۶ تا ۲۰',
    detail: 'شنبه تا پنج‌شنبه · جمعه تعطیل',
    build: () => ({
      days: [...Array(6).fill(null).map(() => open(['08:00', '13:00'], ['16:00', '20:00'])), closed()],
    }),
  },
  {
    id: 'short-thu',
    label: 'شنبه تا چهارشنبه ۸ تا ۱۷',
    detail: 'پنج‌شنبه ۸ تا ۱۳ · جمعه تعطیل',
    build: () => ({
      days: [...Array(5).fill(null).map(() => open(['08:00', '17:00'])), open(['08:00', '13:00']), closed()],
    }),
  },
  {
    id: 'everyday',
    label: 'همه‌روزه، ۹ تا ۲۱',
    detail: 'بدون تعطیلی',
    build: () => ({ days: Array.from({ length: 7 }, () => open(['09:00', '21:00'])) }),
  },
  {
    id: 'always',
    label: 'شبانه‌روزی',
    detail: '۲۴ ساعته، همه‌روزه',
    build: () => ({ days: Array.from({ length: 7 }, () => open(['00:00', '23:59'])) }),
  },
];

/** Which preset, if any, the current week is exactly equal to. */
export function matchPreset(w: WorkingHours | null): string | null {
  if (!w) return null;
  const key = (x: WorkingHours) => JSON.stringify(x.days);
  const mine = key(w);
  return PRESETS.find((p) => key(p.build()) === mine)?.id ?? null;
}

/** Tehran wall-clock, so "open now" is true where the shop actually is. */
function tehranNow(at = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tehran', hour12: false, weekday: 'short', hour: '2-digit', minute: '2-digit',
  }).formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const WEEK: Record<string, number> = { Sat: 0, Sun: 1, Mon: 2, Tue: 3, Wed: 4, Thu: 5, Fri: 6 };
  return { day: WEEK[get('weekday')] ?? 0, minutes: (Number(get('hour')) % 24) * 60 + Number(get('minute')) };
}

export function isOpenNow(w: WorkingHours | null | undefined, at = new Date()): boolean {
  if (!w?.days?.length) return false;
  const { day, minutes } = tehranNow(at);
  const plan = w.days[day];
  if (!plan || plan.closed) return false;
  return plan.intervals.some((iv) => minutes >= minutesOf(iv.from) && minutes < minutesOf(iv.to));
}

/** "امروز ۹:۰۰ تا ۱۸:۰۰" / "امروز تعطیل" — the one line a customer reads. */
export function todayLine(w: WorkingHours | null | undefined, at = new Date()): string {
  if (!w?.days?.length) return '';
  const { day } = tehranNow(at);
  const plan = w.days[day];
  if (!plan || plan.closed) return 'امروز تعطیل';
  return `امروز ${plan.intervals.map((iv) => `${fa(iv.from)} تا ${fa(iv.to)}`).join(' و ')}`;
}

/**
 * The week collapsed into as few lines as possible: consecutive days with
 * identical hours are one row. Seven rows saying the same thing is a table
 * nobody reads.
 */
export function summarise(w: WorkingHours | null | undefined): { days: string; hours: string }[] {
  if (!w?.days?.length) return [];
  const sig = (d: DayPlan) => (d.closed ? 'closed' : d.intervals.map((i) => `${i.from}-${i.to}`).join(','));
  const out: { days: string; hours: string }[] = [];
  let start = 0;
  for (let i = 1; i <= 7; i++) {
    if (i < 7 && sig(w.days[i]) === sig(w.days[start])) continue;
    const plan = w.days[start];
    const label = i - 1 === start ? DAY_NAMES[start] : `${DAY_NAMES[start]} تا ${DAY_NAMES[i - 1]}`;
    out.push({
      days: label,
      hours: plan.closed ? 'تعطیل' : plan.intervals.map((iv) => `${fa(iv.from)} تا ${fa(iv.to)}`).join(' و '),
    });
    start = i;
  }
  return out;
}
