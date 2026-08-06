'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, AgendaItem, toJalali } from '@/lib/api';
import { C, alpha } from './ui';
import { BellIcon, ShieldIcon, WrenchIcon, ChevronLeftIcon } from './icons';

const KIND_ICON = { reminder: BellIcon, document: ShieldIcon, service: WrenchIcon } as const;

function urgency(days: number | null) {
  if (days === null) return { color: C.muted, text: '—' };
  if (days < 0) return { color: C.statusExpired, text: 'گذشته' };
  if (days === 0) return { color: C.statusExpired, text: 'امروز' };
  if (days <= 7) return { color: C.statusDanger, text: `${days} روز` };
  if (days <= 30) return { color: C.statusWarn, text: `${days} روز` };
  return { color: C.muted, text: `${days} روز` };
}

/**
 * The next few things that come due, on the dashboard.
 *
 * This replaces a block that only knew about two document dates read off the
 * vehicle list. The agenda endpoint also covers reminders the owner wrote and
 * services the last visit scheduled, which is most of what there is to miss.
 */
export default function AgendaPreview({ limit = 4 }: { limit?: number }) {
  const [items, setItems] = useState<AgendaItem[] | null>(null);

  useEffect(() => {
    api.agenda.list(60).then(setItems).catch(() => setItems([]));
  }, []);

  if (!items || items.length === 0) return null;

  const shown = items.slice(0, limit);

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <h2 style={{ color: C.text2, fontSize: 14, fontWeight: 700, margin: 0 }}>در پیش رو</h2>
        <Link href="/reminders" style={{ color: C.muted, fontSize: 12.5, fontWeight: 600, textDecoration: 'none' }}>
          مشاهده همه {items.length > limit ? `(${items.length})` : ''}
        </Link>
      </div>

      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, overflow: 'hidden' }}>
        {shown.map((item, i) => {
          const Icon = KIND_ICON[item.kind];
          const u = urgency(item.daysLeft);
          return (
            <Link
              key={item.id}
              href={`/vehicles/${item.vehicleId}?tab=${item.kind === 'document' ? 'documents' : item.kind === 'service' ? 'records' : 'reminders'}`}
              style={{ textDecoration: 'none', display: 'block' }}
            >
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                borderBottom: i < shown.length - 1 ? `1px solid ${C.border}` : 'none',
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 12, flexShrink: 0,
                  background: alpha(u.color, 12), border: `1px solid ${alpha(u.color, 22)}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: u.color,
                }}><Icon size={16} /></div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: C.text, fontSize: 13, fontWeight: 700, margin: 0 }}>{item.title}</p>
                  <p style={{ color: C.subtle, fontSize: 11, margin: '2px 0 0' }}>
                    {item.vehicleName}
                    {item.dueDate ? ` · ${toJalali(item.dueDate)}` : ''}
                    {item.dueDate === null && item.dueMileage != null ? ` · ${item.dueMileage.toLocaleString()} km` : ''}
                  </p>
                </div>

                <span style={{ fontSize: 11.5, fontWeight: 800, color: u.color, whiteSpace: 'nowrap' }}>{u.text}</span>
                <ChevronLeftIcon size={15} color={C.subtle} />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
