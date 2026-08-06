'use client';
import { C, alpha } from './tokens';

export function IconBadge({
  children, color = C.green, size = 44, radius = 14,
}: {
  children: React.ReactNode;
  color?: string;
  size?: number;
  radius?: number;
}) {
  return (
    <div style={{
      width: size, height: size, borderRadius: radius, flexShrink: 0,
      background: `${alpha(color, 12)}`,
      border: `1px solid ${alpha(color, 25)}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color,
      boxShadow: `0 4px 12px ${alpha(color, 13)}`,
    }}>
      {children}
    </div>
  );
}
