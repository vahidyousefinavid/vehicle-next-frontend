'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import RequestServiceModal from '@/components/RequestServiceModal';
import { svcMeta } from '@/components/serviceMeta';
import { api, Vehicle, daysUntil, expiryStatus, SERVICE_TYPES } from '@/lib/api';
import { C, EmptyState, SkeletonRow, SkeletonHero, alpha } from '@/components/ui';
import {
  CarIcon, ShieldIcon, SearchIcon, ChevronLeftIcon, PlusIcon, StoreIcon,
} from '@/components/icons';

/* ── Quick service request cards ─────────────────────────────────── */
const QUICK_SERVICES = SERVICE_TYPES.filter(t => t !== 'سایر');

function QuickServices({ onPick }: { onPick: (type: string) => void }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h2 style={{ color: C.text2, fontSize: 14, fontWeight: 700, margin: 0 }}>درخواست سریع خدمت</h2>
        <Link href="/workshops" style={{
          display: 'flex', alignItems: 'center', gap: 4, color: C.muted, fontSize: 12, fontWeight: 600, textDecoration: 'none',
        }}>
          <StoreIcon size={13} /> همه تعمیرگاه‌ها
        </Link>
      </div>
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
        {QUICK_SERVICES.map(type => {
          const meta = svcMeta(type);
          const Icon = meta.icon;
          return (
            <button
              key={type}
              onClick={() => onPick(type)}
              style={{
                flexShrink: 0, width: 92, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                padding: '14px 8px', borderRadius: 18,
                background: C.surface, border: `1px solid ${C.border}`,
                fontFamily: 'Vazirmatn, sans-serif',
              }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: 13, background: `${alpha(meta.color, 12)}`, border: `1px solid ${alpha(meta.color, 25)}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: meta.color,
              }}><Icon size={19} /></div>
              <span style={{ fontSize: 11, fontWeight: 700, color: C.text, textAlign: 'center', lineHeight: 1.4 }}>{type}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Health progress ring ─────────────────────────────────────── */
function ProgressRing({ pct }: { pct: number }) {
  const r = 26, circ = 2 * Math.PI * r;
  const color = pct > 80 ? C.green : pct > 50 ? C.statusWarn : C.statusExpired;
  return (
    <svg width="68" height="68" viewBox="0 0 68 68" style={{ flexShrink: 0 }}>
      <defs>
        <filter id="ringGlowDash">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <circle cx="34" cy="34" r={r} fill="none" stroke={C.fill4} strokeWidth="5" />
      <circle
        cx="34" cy="34" r={r}
        fill="none" stroke={color} strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={`${(pct / 100) * circ} ${circ}`}
        transform="rotate(-90 34 34)"
        filter="url(#ringGlowDash)"
        style={{ transition: 'stroke-dasharray 0.7s ease' }}
      />
      <text x="34" y="38" textAnchor="middle" fill={C.onHero} fontSize="13" fontWeight="800">{pct}%</text>
    </svg>
  );
}

/* ── Account overview card ────────────────────────────────────── */
function AccountCard({ user, vehicles, alerts, healthy, pct }: {
  user: { name: string } | null;
  vehicles: Vehicle[];
  alerts: Vehicle[];
  healthy: number;
  pct: number;
}) {
  const statusColor = pct > 80 ? C.green : pct > 50 ? C.statusWarn : C.statusExpired;
  const statusLabel = pct > 80 ? 'وضعیت عالی' : pct > 50 ? 'نیاز به توجه' : 'هشدار فوری';

  return (
    <div className="account-card" style={{ padding: '22px 22px 20px', marginBottom: 20 }}>
      <div style={{
        position: 'absolute', top: -50, right: -50, width: 210, height: 210, borderRadius: '50%',
        background: `radial-gradient(circle, ${alpha(C.green, 18)} 0%, transparent 70%)`,
        filter: 'blur(26px)', animation: 'blobPulse 7s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', bottom: -40, left: -40, width: 170, height: 170, borderRadius: '50%',
        background: `radial-gradient(circle, ${alpha(C.blue, 12)} 0%, transparent 70%)`,
        filter: 'blur(22px)', animation: 'blobPulse 9s ease-in-out infinite reverse',
      }} />

      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{
            width: 36, height: 26, borderRadius: 6,
            background: `linear-gradient(135deg, ${C.green}, ${C.greenDark})`,
            boxShadow: `0 3px 12px ${C.greenGlow}`,
          }} />
          <div style={{
            background: C.fill3,
            border: `1px solid ${C.border}`,
            borderRadius: 10, padding: '5px 12px',
            display: 'flex', alignItems: 'center', gap: 6,
            backdropFilter: 'blur(8px)',
          }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: statusColor,
              boxShadow: `0 0 8px ${statusColor}`,
            }} />
            <span style={{ color: C.text2, fontSize: 11, fontWeight: 600 }}>{statusLabel}</span>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div style={{ flex: 1 }}>
            <p style={{ color: C.subtle, fontSize: 10, fontWeight: 600, margin: '0 0 5px', letterSpacing: '0.5px' }}>
              مدیر ناوگان
            </p>
            <p style={{ color: C.onHero, fontSize: 18, fontWeight: 900, margin: 0 }}>
              {user?.name || 'کاربر مهمان'}
            </p>
            <p style={{ color: C.text4, fontSize: 12, fontWeight: 500, margin: '6px 0 0' }}>
              {vehicles.length} خودرو · {healthy} سالم
            </p>
          </div>
          <ProgressRing pct={pct} />
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10,
          paddingTop: 16, borderTop: `1px solid ${C.border}`,
        }}>
          {[
            { label: 'خودروها', value: String(vehicles.length), color: C.green },
            { label: 'هشدارها', value: String(alerts.length), color: alerts.length > 0 ? C.statusExpired : C.statusOk },
            { label: 'سلامت', value: `${pct}%`, color: statusColor },
          ].map(s => (
            <div key={s.label} style={{
              background: C.fill2,
              border: `1px solid ${C.border}`,
              borderRadius: 14, padding: '11px 8px', textAlign: 'center',
            }}>
              <p style={{ color: s.color, fontWeight: 900, fontSize: 19, margin: 0, lineHeight: 1 }}>{s.value}</p>
              <p style={{ color: C.subtle, fontSize: 10, fontWeight: 600, margin: '4px 0 0' }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Vehicle row ──────────────────────────────────────────────── */
function VehicleRow({ v, isLast }: { v: Vehicle; isLast: boolean }) {
  const insDays  = daysUntil(v.insuranceExpiry);
  const tecDays  = daysUntil(v.technicalExpiry);
  const hasAlert = expiryStatus(insDays) !== 'ok' || expiryStatus(tecDays) !== 'ok';
  const color = hasAlert ? C.statusExpired : C.green;

  return (
    <Link href={`/vehicles/${v.id}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '14px 18px',
        borderBottom: isLast ? 'none' : `1px solid ${C.border}`,
        transition: 'background 0.15s',
      }}>
        <div style={{
          width: 46, height: 46, borderRadius: 15, flexShrink: 0,
          background: `${alpha(color, 12)}`,
          border: `1px solid ${alpha(color, 25)}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color,
        }}><CarIcon size={21} /></div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: C.text, fontSize: 14, fontWeight: 700, margin: 0 }}>
            {v.make} {v.model}
          </p>
          <p style={{ color: C.muted, fontSize: 12, fontWeight: 500, margin: '3px 0 0' }}>
            {v.year}{v.fuelType ? ` · ${v.fuelType}` : ''} · {v.currentMileage.toLocaleString()} km
          </p>
        </div>

        <div style={{ flexShrink: 0, textAlign: 'left' }}>
          {v.plateNumber && (
            <span style={{
              display: 'block',
              background: C.fill2,
              border: `1px solid ${C.border}`,
              color: C.muted, fontSize: 10,
              padding: '2px 8px', borderRadius: 7,
              fontFamily: 'monospace', direction: 'ltr',
              marginBottom: 5, textAlign: 'center',
            }}>
              {v.plateNumber}
            </span>
          )}
          <span style={{
            display: 'block', textAlign: 'center',
            fontSize: 11, fontWeight: 700,
            color,
          }}>
            {hasAlert ? 'هشدار' : 'سالم'}
          </span>
        </div>

        <ChevronLeftIcon size={16} color={C.subtle} />
      </div>
    </Link>
  );
}

/* ── Dashboard ────────────────────────────────────────────────── */
export default function Dashboard() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading]   = useState(true);
  const [user, setUser]         = useState<{ name: string } | null>(null);
  const [requestType, setRequestType] = useState<string | null>(null);

  useEffect(() => {
    if (!localStorage.getItem('vtoken')) { router.replace('/'); return; }
    try { setUser(JSON.parse(localStorage.getItem('vuser') || '{}')); } catch {}
    api.vehicles.list().then(setVehicles).finally(() => setLoading(false));
  }, [router]);

  const alerts = vehicles.filter(v =>
    expiryStatus(daysUntil(v.insuranceExpiry)) !== 'ok' ||
    expiryStatus(daysUntil(v.technicalExpiry)) !== 'ok'
  );
  const healthy = vehicles.length - alerts.length;
  const pct     = vehicles.length ? Math.round((healthy / vehicles.length) * 100) : 100;

  const today = new Date().toLocaleDateString('fa-IR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />

      <main style={{ maxWidth: 520, margin: '0 auto', padding: '0 16px calc(88px + env(safe-area-inset-bottom))' }}>

        <div style={{ padding: '18px 0 14px' }}>
          <p style={{ color: C.muted, fontSize: 12, margin: 0, fontWeight: 500 }}>{today}</p>
          <h1 style={{ color: C.text, fontSize: 21, fontWeight: 900, margin: '5px 0 0' }}>
            {user?.name ? `سلام ${user.name}` : 'خوش آمدی'}
          </h1>
        </div>

        {loading ? <SkeletonHero /> : (
          <div style={{ animation: 'fadeInUp 0.45s cubic-bezier(.34,1.2,.64,1) both' }}>
            <AccountCard
              user={user} vehicles={vehicles}
              alerts={alerts} healthy={healthy} pct={pct}
            />
          </div>
        )}

        <QuickServices onPick={setRequestType} />

        {alerts.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ color: C.text2, fontSize: 14, fontWeight: 700, margin: '0 0 10px' }}>هشدارها</h2>
            <div style={{
              background: alpha(C.statusExpired, 7),
              border: `1px solid ${alpha(C.statusExpired, 17)}`,
              borderRadius: 20, overflow: 'hidden',
              backdropFilter: 'blur(14px)',
            }}>
              {alerts.flatMap(v => {
                const rows: { v: Vehicle; type: string; icon: React.ReactNode; days: number | null }[] = [];
                const ins = daysUntil(v.insuranceExpiry);
                const tec = daysUntil(v.technicalExpiry);
                if (expiryStatus(ins) !== 'ok') rows.push({ v, type: 'بیمه شخص ثالث', icon: <ShieldIcon size={17} />, days: ins });
                if (expiryStatus(tec) !== 'ok') rows.push({ v, type: 'معاینه فنی',    icon: <SearchIcon size={17} />, days: tec });
                return rows;
              }).map((a, i, arr) => (
                <Link key={i} href={`/vehicles/${a.v.id}?tab=documents`} style={{ textDecoration: 'none', display: 'block' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '13px 18px',
                    borderBottom: i < arr.length - 1 ? `1px solid ${alpha(C.statusExpired, 10)}` : 'none',
                  }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 13,
                      background: alpha(C.statusExpired, 12),
                      border: `1px solid ${alpha(C.statusExpired, 22)}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: C.statusExpired, flexShrink: 0,
                    }}>{a.icon}</div>
                    <div style={{ flex: 1 }}>
                      <p style={{ color: C.text, fontSize: 13, fontWeight: 700, margin: 0 }}>
                        {a.v.make} {a.v.model}
                      </p>
                      <p style={{ color: C.muted, fontSize: 12, margin: '2px 0 0' }}>{a.type}</p>
                    </div>
                    <span style={{
                      fontSize: 12, fontWeight: 700,
                      color: a.days !== null && a.days < 0 ? C.statusExpired
                           : a.days !== null && a.days < 14 ? C.statusDanger
                           : C.statusWarn,
                    }}>
                      {a.days !== null && a.days < 0 ? 'منقضی شده' : `${a.days} روز`}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ color: C.text2, fontSize: 14, fontWeight: 700, margin: 0 }}>خودروهای من</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {vehicles.length > 0 && (
              <Link href="/vehicles" style={{
                color: C.muted, fontSize: 12.5, fontWeight: 600, textDecoration: 'none',
              }}>
                مشاهده همه
              </Link>
            )}
            <Link href="/vehicles/new" style={{
              display: 'flex', alignItems: 'center', gap: 4,
              color: C.green, fontSize: 13, fontWeight: 700, textDecoration: 'none',
              background: alpha(C.green, 10),
              border: `1px solid ${alpha(C.green, 22)}`,
              borderRadius: 10, padding: '5px 13px',
            }}>
              <PlusIcon size={14} /> افزودن
            </Link>
            </div>
          </div>

          {loading ? (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 22, overflow: 'hidden' }}>
              <SkeletonRow /><SkeletonRow /><SkeletonRow />
            </div>
          ) : vehicles.length === 0 ? (
            <EmptyState
              icon={<CarIcon size={30} />}
              title="هنوز خودرویی ثبت نکردی"
              sub="اولین خودروت رو اضافه کن"
              onAdd={() => router.push('/vehicles/new')}
              btnLabel="افزودن خودرو"
            />
          ) : (
            <div style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 22,
              overflow: 'hidden',
            }}>
              {vehicles.map((v, i) => (
                <VehicleRow key={v.id} v={v} isLast={i === vehicles.length - 1} />
              ))}
            </div>
          )}
        </div>

      </main>

      {requestType && <RequestServiceModal serviceType={requestType} onClose={() => setRequestType(null)} />}
      <BottomNav />
    </div>
  );
}
