'use client';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { SunIcon, MoonIcon, CheckIcon } from './icons';
import { C, alpha } from './ui';
import { useAnchoredPopover, popoverBackdropStyle } from './ui/useAnchoredPopover';
import {
  getTheme, setTheme, getSkin, setSkin, SKINS, type Theme, type Skin,
} from '@/lib/theme';

/**
 * Appearance: the ground and the accent, both the user's choice.
 *
 * This was a one-tap dark/light toggle. It is a picker now because the accent
 * became selectable too, and a toggle cannot express two axes. The trigger
 * keeps its old footprint so no header reflows, and carries the live accent as
 * a dot so the control says what it controls.
 *
 * Both values are already on <html> before this mounts (see THEME_BOOT_SCRIPT),
 * so initial state is read from the DOM rather than from storage — that keeps
 * the control in sync with what the user is actually looking at, with no flash
 * and no hydration mismatch.
 */
export default function ThemeToggle({ size = 34 }: { size?: number }) {
  const [theme, setThemeState] = useState<Theme>('dark');
  const [skin, setSkinState] = useState<Skin>('amber');
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  /* stable identity: the hook keeps onClose in an effect dependency, so an
     inline arrow would tear down and re-add its listeners on every render */
  const close = useCallback(() => setOpen(false), []);
  const { anchorRef, popRef, popoverStyle, mobile } = useAnchoredPopover(
    open, close, { minWidth: 248, maxWidth: 300 },
  );

  useEffect(() => {
    setMounted(true);
    setThemeState(getTheme());
    setSkinState(getSkin());
    const onTheme = (e: Event) => setThemeState((e as CustomEvent<Theme>).detail);
    const onSkin = (e: Event) => setSkinState((e as CustomEvent<Skin>).detail);
    window.addEventListener('themechange', onTheme);
    window.addEventListener('skinchange', onSkin);
    return () => {
      window.removeEventListener('themechange', onTheme);
      window.removeEventListener('skinchange', onSkin);
    };
  }, []);

  // a tap outside closes; Escape and reposition are handled by the hook
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      const el = document.getElementById('__appearance__');
      if (el && !el.contains(e.target as Node) && !anchorRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, anchorRef]);

  const isDark = theme === 'dark';
  /* the swatch has to show the accent as it will look on the ground the user
     is standing on — the same skin is a bronze in daylight and an amber at
     night, and a picker that shows the other one is lying */
  const swatchOf = (s: (typeof SKINS)[number]) => (isDark ? s.dark : s.light);
  const current = SKINS.find((s) => s.id === skin) ?? SKINS[0];

  const themeChoice = (value: Theme, label: string, icon: ReactNode) => {
    const on = theme === value;
    return (
      <button
        key={value}
        type="button"
        onClick={() => { setTheme(value); setThemeState(value); }}
        aria-pressed={on}
        style={{
          flex: 1, minHeight: 44, borderRadius: 12, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          fontFamily: 'inherit', fontSize: 13, fontWeight: 800,
          background: on ? alpha(C.green, 14) : C.fill2,
          color: on ? C.green : C.text2,
          border: `1px solid ${on ? alpha(C.green, 40) : C.border}`,
          transition: 'background .15s, color .15s, border-color .15s',
        }}
      >
        {icon}{label}
      </button>
    );
  };

  const popup = (
    <div
      id="__appearance__"
      ref={popRef}
      role="dialog"
      aria-label="ظاهر برنامه"
      style={{
        ...popoverStyle,
        zIndex: 99999,
        background: C.surfaceSolid,
        border: `1px solid ${C.border}`,
        borderRadius: 18,
        boxShadow: C.shadowPopover,
        padding: 14,
        display: 'grid',
        gap: 14,
        direction: 'rtl',
      }}
    >
      <div style={{ display: 'grid', gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: C.muted }}>زمینه</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {themeChoice('dark', 'تیره', <MoonIcon size={15} />)}
          {themeChoice('light', 'روشن', <SunIcon size={15} />)}
        </div>
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: C.muted }}>
          رنگ تأکید
          <b style={{ fontWeight: 700, color: C.text2, marginInlineStart: 6 }}>{current.label}</b>
        </span>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {SKINS.map((s) => {
            const on = s.id === skin;
            const hue = swatchOf(s);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => { setSkin(s.id); setSkinState(s.id); }}
                aria-label={s.label}
                aria-pressed={on}
                title={s.label}
                style={{
                  width: 44, height: 44, borderRadius: 13, cursor: 'pointer',
                  display: 'grid', placeItems: 'center',
                  background: alpha(hue, 16),
                  border: `1px solid ${on ? hue : C.border}`,
                  transition: 'border-color .15s, background .15s',
                }}
              >
                <span style={{
                  width: 22, height: 22, borderRadius: 8, background: hue,
                  display: 'grid', placeItems: 'center',
                  color: isDark ? '#14110A' : '#FFFFFF',
                }}>
                  {on && <CheckIcon size={13} />}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        ref={anchorRef}
        className="tap44"
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="ظاهر و رنگ برنامه"
        aria-haspopup="dialog"
        aria-expanded={open}
        title="ظاهر و رنگ"
        style={{
          position: 'relative',
          width: size, height: size, borderRadius: 11,
          background: C.surface2,
          border: `1px solid ${open ? alpha(C.green, 45) : C.border}`,
          color: C.muted,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, transition: 'color .15s, background .15s, border-color .15s',
        }}
      >
        {isDark ? <MoonIcon size={17} /> : <SunIcon size={17} />}
        {/* the live accent, so the control names its own subject */}
        <span
          aria-hidden="true"
          style={{
            position: 'absolute', insetInlineEnd: 4, bottom: 4,
            width: 7, height: 7, borderRadius: '50%',
            background: C.green,
            boxShadow: `0 0 0 2px ${C.surface2}`,
          }}
        />
      </button>

      {open && mounted && createPortal(
        mobile
          ? <div style={popoverBackdropStyle} onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>{popup}</div>
          : popup,
        document.body,
      )}
    </>
  );
}
