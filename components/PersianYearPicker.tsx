'use client';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import * as jalaali from 'jalaali-js';
import { CalendarIcon } from './icons';

function toFa(n: number) {
  return String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);
}

export function currentJalaliYear(): number {
  const t = new Date();
  return jalaali.toJalaali(t.getFullYear(), t.getMonth() + 1, t.getDate()).jy;
}

const C = {
  primary: '#22C55E',
  border: 'rgba(255,255,255,0.09)',
  text: 'rgba(240,246,255,0.92)',
  muted: 'rgba(200,215,235,0.60)',
};

const navBtn: React.CSSProperties = {
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.10)',
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
  const [popupPos, setPopupPos] = useState<React.CSSProperties>({});
  const [mounted, setMounted]   = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

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
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      const popH = 220;
      const spaceBelow = window.innerHeight - r.bottom - 8;
      const top = spaceBelow >= popH ? r.bottom + 6 : r.top - popH - 6;
      setPopupPos({
        position: 'fixed',
        top: Math.max(8, top),
        left: r.left,
        width: Math.max(r.width, 272),
        maxWidth: 310,
      });
    }
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
      style={{
        ...popupPos,
        zIndex: 99999,
        background: '#0D1F38',
        border: '1px solid rgba(255,255,255,0.13)',
        borderRadius: 18,
        padding: '12px 12px 14px',
        boxShadow: '0 24px 72px rgba(0,0,0,0.70), 0 4px 16px rgba(0,0,0,0.40)',
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
                background: isSel ? C.primary : 'rgba(255,255,255,0.05)',
                color: isSel ? 'white' : isToday ? C.primary : C.text,
                fontSize: 12, fontWeight: isSel || isToday ? 800 : 500,
                cursor: 'pointer', fontFamily: 'Vazirmatn, sans-serif',
                textAlign: 'center', transition: 'background 0.10s',
              }}
              onMouseEnter={e => { if (!isSel) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,206,180,0.15)'; }}
              onMouseLeave={e => { if (!isSel) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'; }}
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
        ref={triggerRef}
        type="button"
        onClick={openPicker}
        style={{
          width: '100%',
          background: 'rgba(255,255,255,0.06)',
          border: `1px solid ${open ? C.primary : C.border}`,
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

      {open && mounted && createPortal(popup, document.body)}
    </>
  );
}
