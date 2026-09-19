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
    <span
      className="uib"
      style={{
        width: size, height: size, borderRadius: radius, flexShrink: 0,
        background: alpha(color, 12),
        display: 'grid', placeItems: 'center',
        color,
      }}
    >
      {children}
    </span>
  );
}
