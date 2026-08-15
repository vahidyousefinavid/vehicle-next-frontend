import {
  BellIcon, MessageIcon, CalendarIcon, CreditCardIcon, NavigationIcon,
  WrenchIcon, LinkIcon,
} from './icons';
import { C } from './ui';
import type { NotificationCategory } from '@/lib/api';

/**
 * What each kind of notification looks like, in one place.
 *
 * The bell and the inbox page show the same events at different sizes, and an
 * event that is amber in a dropdown and green on a page reads as two different
 * things. The colour also carries meaning on its own — money is one colour
 * wherever it appears — so it is worth being a table rather than a decision
 * made twice.
 */
export interface CategoryMeta {
  label: string;
  color: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
}

export const CATEGORY_META: Record<NotificationCategory, CategoryMeta> = {
  link:        { label: 'اتصال تعمیرگاه', color: C.blue,          icon: LinkIcon },
  appointment: { label: 'نوبت‌ها',         color: C.green,         icon: CalendarIcon },
  invoice:     { label: 'صورتحساب',       color: C.amber,         icon: CreditCardIcon },
  message:     { label: 'پیام‌ها',         color: C.blue,          icon: MessageIcon },
  tracker:     { label: 'ردیاب',          color: C.statusExpired, icon: NavigationIcon },
  reminder:    { label: 'یادآورها',       color: C.green,         icon: WrenchIcon },
  other:       { label: 'سایر',           color: C.muted,         icon: BellIcon },
};

export function metaFor(category?: NotificationCategory): CategoryMeta {
  return CATEGORY_META[category ?? 'other'] ?? CATEGORY_META.other;
}

/**
 * What the button at the bottom of an opened notification should say. A
 * generic «مشاهده» makes the reader guess where they are about to be sent.
 */
export function destinationLabel(url: string | null): string {
  if (!url) return '';
  if (url.startsWith('/tracking')) return 'دیدن روی نقشه';
  if (url.startsWith('/messages')) return 'باز کردن گفتگو';
  if (url.startsWith('/appointments')) return 'مشاهدهٔ نوبت';
  if (url.includes('tab=records')) return 'مشاهدهٔ سوابق و صورتحساب';
  if (url.includes('tab=documents')) return 'مشاهدهٔ مدارک';
  if (url.includes('tab=reminders')) return 'مشاهدهٔ یادآورها';
  if (url.startsWith('/vehicles')) return 'مشاهدهٔ خودرو';
  if (url.startsWith('/reminders')) return 'مشاهدهٔ یادآورها';
  return 'مشاهدهٔ جزئیات';
}
