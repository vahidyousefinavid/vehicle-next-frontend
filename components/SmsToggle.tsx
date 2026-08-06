'use client';
import { useState } from 'react';
import { api, type User } from '@/lib/api';
import { saveUser } from '@/lib/session';
import { C, Card, alpha } from './ui';
import { MessageIcon } from './icons';

/**
 * Opt-out for transactional SMS. Push and in-app notifications are separate —
 * turning this off only stops the texts, so someone who lives in the app can
 * silence their inbox without losing the alerts.
 */
export default function SmsToggle({ user, onChange }: { user: User; onChange?: (u: User) => void }) {
  const enabled = user.smsNotifications !== false;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function toggle() {
    setSaving(true);
    setError('');
    try {
      const updated = await api.auth.updateProfile({ smsNotifications: !enabled });
      saveUser(updated);
      onChange?.(updated);
    } catch (err: any) {
      setError(err.message || 'ذخیره تنظیمات ناموفق بود');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: saving ? 'progress' : 'pointer' }}>
        <span style={{
          width: 34, height: 34, borderRadius: 11, flexShrink: 0,
          background: alpha(C.green, 12), border: `1px solid ${alpha(C.green, 25)}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.green,
        }}>
          <MessageIcon size={16} />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 13, fontWeight: 800, color: C.text }}>
            اطلاع‌رسانی پیامکی
          </span>
          <span style={{ display: 'block', fontSize: 11, color: C.muted, marginTop: 3, lineHeight: 1.6 }}>
            {user.role === 'mechanic'
              ? 'درخواست نوبت جدید و لغو نوبت‌ها با پیامک بهت اطلاع داده می‌شه'
              : 'تایید، رد و انجام‌شدن نوبت‌ها با پیامک بهت اطلاع داده می‌شه'}
          </span>
        </span>
        <input
          type="checkbox"
          checked={enabled}
          disabled={saving}
          onChange={toggle}
          style={{ width: 18, height: 18, accentColor: C.green, flexShrink: 0 }}
        />
      </label>
      {error && <p style={{ fontSize: 11, color: C.statusExpired, margin: '10px 0 0' }}>{error}</p>}
    </Card>
  );
}
