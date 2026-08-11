'use client';
import { useRouter } from 'next/navigation';
import { C, alpha } from './ui';
import { WrenchIcon, FuelIcon, BellIcon, ShieldIcon } from './icons';

/**
 * The four things an owner records often, one tap from the dashboard.
 *
 * Recording used to mean opening a car, finding the right tab, and then the
 * add button — three navigations before typing anything. Since keeping the log
 * up to date is what makes every other screen worth reading, it gets top billing.
 */
const ACTIONS = [
  { label: 'ثبت سرویس',  hint: 'تعمیر یا تعویض',   icon: WrenchIcon, color: C.statusInfo,   tab: 'records'   },
  { label: 'ثبت سوخت',   hint: 'بنزین و مصرف',     icon: FuelIcon,   color: C.statusDanger, tab: 'fuel'      },
  { label: 'یادآور',     hint: 'کار آینده',         icon: BellIcon,   color: C.green,        tab: 'reminders' },
  { label: 'مدارک',      hint: 'بیمه و معاینه',     icon: ShieldIcon, color: C.statusMint,   tab: 'documents' },
] as const;

export default function QuickEntry({ vehicleId }: { vehicleId?: string }) {
  const router = useRouter();

  /* With no car yet, every tile has to route to adding one first — otherwise
     the tap lands on a page that can't do anything. */
  function go(tab: string) {
    if (!vehicleId) { router.push('/vehicles/new'); return; }
    router.push(`/vehicles/${vehicleId}?tab=${tab}`);
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <h2 style={{ color: C.text2, fontSize: 14, fontWeight: 700, margin: '0 0 10px' }}>ثبت سریع</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 9 }}>
        {ACTIONS.map(a => {
          const Icon = a.icon;
          return (
            <button
              key={a.label}
              onClick={() => go(a.tab)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
                background: C.surface, border: `1px solid ${C.border}`,
                borderRadius: 18, padding: '13px 5px',
                fontFamily: 'var(--font-sans)',
              }}
            >
              <span style={{
                width: 40, height: 40, borderRadius: 13,
                background: alpha(a.color, 12), border: `1px solid ${alpha(a.color, 25)}`,
                color: a.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}><Icon size={19} /></span>
              <span style={{ fontSize: 11, fontWeight: 800, color: C.text, textAlign: 'center', lineHeight: 1.4 }}>
                {a.label}
              </span>
              <span style={{ fontSize: 9.5, color: C.subtle, textAlign: 'center', lineHeight: 1.3 }}>
                {a.hint}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
