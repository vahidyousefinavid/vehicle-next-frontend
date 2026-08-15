/**
 * How long ago something happened, in words.
 *
 * A notification's timestamp is almost always read as "how fresh is this",
 * not "what date was it" — «۳ دقیقه پیش» answers that at a glance where
 * «۲۵ مرداد ۱۴۰۵» makes you do arithmetic. The full date is still there when
 * an item is opened, which is when the exact moment starts to matter.
 */
const fa = new Intl.NumberFormat('fa-IR');

export function relativeTime(iso?: string): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (isNaN(then)) return '';

  const seconds = Math.floor((Date.now() - then) / 1000);
  // Clock skew between the phone and the server can put a fresh event a few
  // seconds in the future; «همین حالا» is truer than «۱ ثانیه دیگر».
  if (seconds < 60) return 'همین حالا';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${fa.format(minutes)} دقیقه پیش`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${fa.format(hours)} ساعت پیش`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${fa.format(days)} روز پیش`;

  return jalaliDate(iso);
}

export function jalaliDate(iso?: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return '';
  }
}

/** Date and clock time, for reading one notification in full. */
export function jalaliDateTime(iso?: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const date = d.toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' });
    const time = d.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
    return `${date} — ساعت ${time}`;
  } catch {
    return '';
  }
}
