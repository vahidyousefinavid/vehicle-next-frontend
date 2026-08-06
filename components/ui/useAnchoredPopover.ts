'use client';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

/**
 * Positions a portal popover next to its trigger and keeps it inside the viewport.
 *
 * قبلاً پاپ‌آپ با `left: trigger.left` و عرض ثابت ۲۷۲ پیکسل باز می‌شد، برای همین هر
 * فیلدی که در ستون کناری یک گرید دوستونه بود (تاریخ سرویس، انقضای بیمه، …) از لبه‌ی
 * صفحه بیرون می‌زد. حالا:
 *
 * - روی موبایل (≤ ۵۶۰px) اصلاً لنگر نمی‌اندازد و به‌صورت کارت وسط صفحه باز می‌شود
 * - روی صفحه‌های بزرگ‌تر: افقی از راست هم‌تراز فیلد و بعد داخل صفحه کلمپ می‌شود
 * - عمودی زیر فیلد، و اگر جا نبود بالای آن؛ اگر هیچ‌طرف جا نبود پایین صفحه می‌چسبد
 * - با resize / scroll / تغییر ارتفاع محتوا (روز ⇄ ماه ⇄ سال) دوباره جای‌گذاری می‌شود
 */

const MOBILE_MAX = 560; // زیر این عرض، پاپ‌آپ مودالِ وسط‌چین می‌شود
const MARGIN = 8;   // breathing room against the viewport edges
const GAP    = 6;   // distance between trigger and popover
const DOCK_H = 220; // below this available height we dock instead of anchoring

const MOBILE_STYLE: React.CSSProperties = {
  width: 'min(340px, calc(100vw - 32px))',
  maxHeight: 'calc(100vh - 64px)',
  overflowY: 'auto',
  overscrollBehavior: 'contain',
};

/** پس‌زمینه‌ی تیره‌ی حالت موبایل — حالت لنگرانداخته بدون بک‌دراپ رندر می‌شود */
export const popoverBackdropStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 99998,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: 16,
  background: 'rgba(6,10,20,0.55)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  animation: 'fadeIn 0.16s ease both',
};

export function useAnchoredPopover<A extends HTMLElement = HTMLButtonElement>(
  open: boolean,
  onClose: () => void,
  { minWidth = 272, maxWidth = 320 }: { minWidth?: number; maxWidth?: number } = {},
) {
  const anchorRef = useRef<A>(null);
  const popRef    = useRef<HTMLDivElement>(null);
  const lastKey   = useRef('');
  const [mobile, setMobile] = useState(false);
  const [style, setStyle] = useState<React.CSSProperties>({
    position: 'fixed', top: 0, left: 0, visibility: 'hidden',
  });

  const place = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;

    if (document.documentElement.clientWidth <= MOBILE_MAX) {
      setMobile(true);
      if (lastKey.current !== 'mobile') {
        lastKey.current = 'mobile';
        setStyle(MOBILE_STYLE);
      }
      return;
    }
    setMobile(false);

    const vw    = document.documentElement.clientWidth;
    const vh    = window.innerHeight;
    const r     = anchor.getBoundingClientRect();
    const avail = Math.max(160, vw - MARGIN * 2);
    const width = Math.max(160, Math.min(Math.max(r.width, minWidth), maxWidth, avail));
    const h     = popRef.current?.offsetHeight ?? 0;

    const roomBelow = vh - r.bottom - GAP - MARGIN;
    const roomAbove = r.top - GAP - MARGIN;

    let next: React.CSSProperties;

    if (Math.max(roomBelow, roomAbove) < DOCK_H) {
      // no usable room either side (short screen / landscape / on-screen keyboard) → bottom sheet
      next = {
        position: 'fixed', left: MARGIN, bottom: MARGIN, width: avail,
        maxHeight: Math.min(vh - MARGIN * 2, 440),
      };
    } else {
      let left = r.right - width;                                  // RTL: align right edges
      left = Math.min(Math.max(MARGIN, left), vw - width - MARGIN); // …then keep it on screen

      let top: number, maxHeight: number;
      if (!h || h <= roomBelow) {
        top = r.bottom + GAP; maxHeight = roomBelow;
      } else if (h <= roomAbove) {
        top = r.top - GAP - h; maxHeight = roomAbove;
      } else if (roomBelow >= roomAbove) {
        top = r.bottom + GAP; maxHeight = roomBelow;
      } else {
        top = MARGIN; maxHeight = roomAbove;
      }
      next = { position: 'fixed', top, left, width, maxHeight };
    }

    next = { ...next, overflowY: 'auto', overscrollBehavior: 'contain', visibility: 'visible' };

    const key = JSON.stringify(next);
    if (key === lastKey.current) return;
    lastKey.current = key;
    setStyle(next);
  }, [minWidth, maxWidth]);

  useLayoutEffect(() => {
    if (!open) {
      lastKey.current = '';
      setStyle({ position: 'fixed', top: 0, left: 0, visibility: 'hidden' });
      return;
    }
    place();
  }, [open, place]);

  // در حالت مودال، صفحه‌ی پشت نباید اسکرول شود
  useEffect(() => {
    if (!open || !mobile) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open, mobile]);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('resize', place);
    window.addEventListener('orientationchange', place);
    window.addEventListener('scroll', place, true);
    window.addEventListener('keydown', onKey);

    // content height changes when the picker switches between day / month / year views
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(place) : null;
    if (ro && popRef.current) ro.observe(popRef.current);

    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('orientationchange', place);
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('keydown', onKey);
      ro?.disconnect();
    };
  }, [open, place, onClose]);

  return { anchorRef, popRef, popoverStyle: style, mobile, reposition: place };
}
