'use client';
import { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import * as jalaali from 'jalaali-js';
import { CalendarIcon } from './icons';
import { C, alpha } from './ui/tokens';
import { useAnchoredPopover, popoverBackdropStyle } from './ui/useAnchoredPopover';

function toFa(n: number) {
  return String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);
}

export function currentJalaliYear(): number {
  const t = new Date();
  return jalaali.toJalaali(t.getFullYear(), t.getMonth() + 1, t.getDate()).jy;
}


const navBtn: React.CSSProperties = {
  background: C.fill3,
  border: `1px solid ${C.border}`,
  borderRadius: 9, width: 30, height: 30,
  cursor: 'pointer', color: C.muted,
  fontSize: 17, display: 'flex', alignItems: 'center', justifyContent: 'center',
  flexShrink: 0,
};

/* ─── Component ────────────────────────────────────────────────── */
export default function PersianYearPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (year: number) => void;
}) {
  const todayY = currentJalaliYear();

  const [open, setOpen]         = useState(false);
  const [yearPage, setYearPage] = useState(Math.floor((value || todayY) / 12) * 12);
  const [mounted, setMounted]   = useState(false);

  const close = useCallback(() => setOpen(false), []);
  const { anchorRef, popRef, popoverStyle, mobile } = useAnchoredPopover(open, close);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      const el = document.getElementById('__pyp__');
      if (el && !el.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  function openPicker() {
    setYearPage(Math.floor((value || todayY) / 12) * 12);
    setOpen(true);
  }

  function pickYear(y: number) {
    onChange(y);
    setOpen(false);
  }

  const yearCells = Array.from({ length: 12 }, (_, i) => yearPage + i);

  const popup = (
    <div
      id="__pyp__"
      ref={popRef}
      style={{
        ...popoverStyle,
        zIndex: 99999,
        boxSizing: 'border-box',
        background: C.surfaceSolid,
        border: `1px solid ${C.borderStrong}`,
        borderRadius: 18,
        padding: '12px 12px 14px',
        boxShadow: C.shadowPopover,
        userSelect: 'none',
        direction: 'rtl',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 6 }}>
        <button type="button" onClick={() => setYearPage(p => p + 12)} style={navBtn}>›</button>
        <span style={{ color: C.text, fontWeight: 800, fontSize: 13, fontFamily: 'Vazirmatn, sans-serif', flex: 1, textAlign: 'center' }}>
          {toFa(yearPage)} – {toFa(yearPage + 11)}
        </span>
        <button type="button" onClick={() => setYearPage(p => p - 12)} style={navBtn}>‹</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
        {yearCells.map(y => {
          const isSel   = value === y;
          const isToday = todayY === y;
          return (
            <button
              key={y}
              type="button"
              onClick={() => pickYear(y)}
              style={{
                padding: '10px 4px', borderRadius: 11,
                border: isToday && !isSel ? '1.5px solid rgba(0,206,180,0.55)' : '1.5px solid transparent',
                background: isSel ? C.green : C.fill2,
                color: isSel ? C.onAccent : isToday ? C.green : C.text,
                fontSize: 12, fontWeight: isSel || isToday ? 800 : 500,
                cursor: 'pointer', fontFamily: 'Vazirmatn, sans-serif',
                textAlign: 'center', transition: 'background 0.10s',
              }}
              onMouseEnter={e => { if (!isSel) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,206,180,0.15)'; }}
              onMouseLeave={e => { if (!isSel) (e.currentTarget as HTMLButtonElement).style.background = C.fill2; }}
            >
              {toFa(y)}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={openPicker}
        style={{
          width: '100%',
          background: C.fill2,
          border: `1px solid ${open ? C.green : C.border}`,
          borderRadius: 14, padding: '11px 14px',
          fontSize: 13, fontWeight: value ? 600 : 400,
          color: value ? C.text : C.muted,
          fontFamily: 'Vazirmatn, sans-serif',
          cursor: 'pointer', textAlign: 'right',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          transition: 'border-color 0.15s',
          boxSizing: 'border-box',
          direction: 'rtl',
        }}
      >
        <span>{value ? toFa(value) : 'انتخاب سال'}</span>
        <span style={{ opacity: 0.65, display: 'flex' }}><CalendarIcon size={15} /></span>
      </button>

      {open && mounted && createPortal(
        mobile
          ? <div style={popoverBackdropStyle} onMouseDown={e => { if (e.target === e.currentTarget) setOpen(false); }}>{popup}</div>
          : popup,
        document.body,
      )}
    </>
  );
}
