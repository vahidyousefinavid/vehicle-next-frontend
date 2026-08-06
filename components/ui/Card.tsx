'use client';
import { C, alpha } from './tokens';

export function Card({
  children, style, accentColor, padding = '16px 18px', className,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  accentColor?: string;
  padding?: string;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 20,
        boxShadow: C.shadowSoft,
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
    >
      {accentColor && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
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
    <div style={{
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderRadius: 20,
      boxShadow: C.shadowSoft,
      padding: '16px 18px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          {icon && (
            <div style={{
              width: 30, height: 30, borderRadius: 10,
              background: alpha(C.green, 12),
              border: `1px solid ${alpha(C.green, 19)}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: C.green, flexShrink: 0,
            }}>{icon}</div>
          )}
          <h2 style={{ fontSize: 14, fontWeight: 800, color: C.text, margin: 0 }}>{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
