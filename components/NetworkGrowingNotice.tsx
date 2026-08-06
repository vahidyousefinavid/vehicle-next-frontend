'use client';
import { C, alpha } from './ui';
import { StoreIcon } from './icons';

/**
 * Sets expectations above the service-request section.
 *
 * The provider network is still filling in, so a customer searching their city
 * may legitimately find nobody. Saying so up front reads as a young product
 * rather than a broken one — and it's why the record-keeping features, which
 * work on day one, sit above this on every screen.
 */
export default function NetworkGrowingNotice({ compact = false }: { compact?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 11,
      background: alpha(C.green, 8),
      border: `1px solid ${alpha(C.green, 20)}`,
      borderRadius: 16,
      padding: compact ? '10px 13px' : '13px 15px',
      marginBottom: 12,
    }}>
      <span style={{
        width: 32, height: 32, borderRadius: 11, flexShrink: 0,
        background: alpha(C.green, 14), color: C.green,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <StoreIcon size={16} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 12.5, fontWeight: 800, color: C.text, margin: 0 }}>
          شبکه سرویس‌دهنده‌ها در حال گسترشه
        </p>
        <p style={{ fontSize: 11, color: C.muted, margin: '3px 0 0', lineHeight: 1.7 }}>
          هر روز تعمیرگاه‌ها و فروشگاه‌های بیشتری از سراسر کشور اضافه می‌شن. اگر هنوز
          توی شهر تو گزینه‌ای نیست، به‌زودی می‌رسیم.
        </p>
      </div>
    </div>
  );
}
