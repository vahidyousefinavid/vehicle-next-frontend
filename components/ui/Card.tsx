'use client';
import { C, alpha } from './tokens';

/**
 * The surface most of the app is built from.
 *
 * A card that can be pressed now behaves like it: it lifts under a pointer,
 * gives under a finger and shows a focus ring — which it did not before, so on
 * a phone a tappable card and a plain one were indistinguishable until
 * something happened. The look is the solid surface the newer screens use, so
 * old and new screens stop reading as two different apps.
 */
export function Card({
  children, style, accentColor, padding = '16px 18px', className, onClick, ariaLabel,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  accentColor?: string;
  padding?: string;
  className?: string;
  /** Makes the whole card actionable. Keyboard support comes with it — a card you can
   *  click but not tab to is a control only some people can reach. */
  onClick?: () => void;
  ariaLabel?: string;
}) {
  return (
    <div
      className={`uic${onClick ? ' uic-tap' : ''}${className ? ` ${className}` : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? ariaLabel : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      style={{
        background: C.surfaceSolid,
        borderRadius: 20,
        boxShadow: C.shadowSoft,
        position: 'relative',
        overflow: 'hidden',
        ...(accentColor ? { ['--uic-hue' as string]: accentColor } : null),
        ...style,
      }}
    >
      {accentColor && (
        <span style={{
          position: 'absolute', top: 0, insetInline: 0, height: 3,
          background: `linear-gradient(90deg, ${accentColor}, ${alpha(accentColor, 25)})`,
        }} />
      )}
      <div style={{ padding }}>{children}</div>
    </div>
  );
}

export function SectionCard({
  title, icon, children, action,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="uic" style={{ background: C.surfaceSolid, borderRadius: 20, boxShadow: C.shadowSoft, padding: '16px 18px' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
          {icon && (
            <span style={{
              width: 30, height: 30, borderRadius: 10, flexShrink: 0,
              background: alpha(C.green, 12), color: C.green,
              display: 'grid', placeItems: 'center',
            }}>{icon}</span>
          )}
          <h2 style={{ fontSize: 14.5, fontWeight: 900, color: C.textStrong, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</h2>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}
