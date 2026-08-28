"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import RequestServiceModal from '@/components/RequestServiceModal';
import NetworkGrowingNotice from '@/components/NetworkGrowingNotice';
import QuickEntry from '@/components/QuickEntry';
import AgendaPreview from '@/components/AgendaPreview';
import { api, Vehicle, daysUntil, expiryStatus, SERVICE_TYPES } from '@/lib/api';
import { C, EmptyState, SkeletonRow, SkeletonHero, alpha } from '@/components/ui';
import {
  BatteryIcon, BellIcon, CalendarIcon, CarIcon, ChevronLeftIcon, CloudIcon,
  GaugeIcon, PlusIcon, SearchIcon, StoreIcon, WrenchIcon,
} from '@/components/icons';

const ACTIVE_MACHINE_SERVICES = ['تعویض باتری', 'تنظیم موتور', 'سرویس جلوبندی', 'تعمیر ترمز'];
const SOON_MACHINE_SERVICES = ['تعویض روغن', 'لاستیک و پنچرگیری', 'کارواش و دیتیلینگ', 'کولر و برق خودرو', 'صافکاری و بدنه', 'امداد جاده‌ای'];

function serviceIcon(type: string) {
  if (type.includes('باتری')) return <BatteryIcon size={20} />;
  if (type.includes('موتور') || type.includes('دیاگ')) return <GaugeIcon size={20} />;
  return <WrenchIcon size={20} />;
}

function ActionHub({ vehicles, alerts, onService }: { vehicles: Vehicle[]; alerts: Vehicle[]; onService: (type: string) => void }) {
  const hasVehicle = vehicles.length > 0;
  const primary = hasVehicle ? 'تعویض باتری' : '';
  return (
    <section className="action-hub" style={{ background: C.surfaceSolid, border: `1px solid ${C.borderStrong}`, boxShadow: C.shadowCard }}>
      <div className="hub-head">
        <div>
          <p className="eyebrow" style={{ color: C.green }}>شروع سریع</p>
          <h2 style={{ color: C.textStrong }}>امروز چه کاری داری؟</h2>
          <p style={{ color: C.text2 }}>خدمات ماشین و کارهای نرم‌افزاری جدا شده‌اند تا با کمترین کلیک شروع کنی.</p>
        </div>
        <div className="hub-alert" style={{ background: alerts.length ? alpha(C.statusDanger, 10) : alpha(C.green, 10), border: `1px solid ${alerts.length ? alpha(C.statusDanger, 25) : alpha(C.green, 25)}` }}>
          <strong style={{ color: alerts.length ? C.statusDanger : C.green }}>{alerts.length}</strong>
          <span style={{ color: C.muted }}>هشدار فعال</span>
        </div>
      </div>
      <div className="primary-actions">
        <button type="button" onClick={() => hasVehicle ? onService(primary) : undefined} disabled={!hasVehicle} className="big-action" style={{ background: hasVehicle ? alpha(C.green, 11) : C.fill2, border: `1px solid ${hasVehicle ? alpha(C.green, 30) : C.border}`, color: C.textStrong }}>
          <span style={{ color: hasVehicle ? C.green : C.muted }}><WrenchIcon size={23} /></span>
          <strong>درخواست خدمت ماشین</strong>
          <small style={{ color: C.muted }}>{hasVehicle ? 'باتری، دیاگ و سرویس را مستقیم ثبت کن' : 'اول یک خودرو ثبت کن'}</small>
        </button>
        <Link href="/vehicles/new" className="big-action" style={{ background: C.fill2, border: `1px solid ${C.border}`, color: C.textStrong }}>
          <span style={{ color: C.statusInfo }}><CarIcon size={23} /></span>
          <strong>ثبت ماشین</strong>
          <small style={{ color: C.muted }}>پلاک، مدل، مدارک و کیلومتر</small>
        </Link>
        <Link href="/workshops" className="big-action" style={{ background: C.fill2, border: `1px solid ${C.border}`, color: C.textStrong }}>
          <span style={{ color: C.statusWarn }}><StoreIcon size={23} /></span>
          <strong>پیدا کردن تعمیرگاه</strong>
          <small style={{ color: C.muted }}>دیدن مراکز و خدمات نزدیک</small>
        </Link>
      </div>
    </section>
  );
}

function MachineServices({ onPick, disabled }: { onPick: (type: string) => void; disabled: boolean }) {
  const active = SERVICE_TYPES.filter(t => ACTIVE_MACHINE_SERVICES.includes(t));
  return (
    <section className="panel" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
      <div className="panel-head">
        <div><p className="eyebrow" style={{ color: C.green }}>خدمات ماشین</p><h2 style={{ color: C.text2 }}>انتخاب مستقیم خدمت</h2></div>
        <Link href="/workshops" style={{ color: C.muted, textDecoration: 'none', fontSize: 12, fontWeight: 800 }}>همه تعمیرگاه‌ها</Link>
      </div>
      {disabled && <p className="helper" style={{ color: C.statusWarn, background: alpha(C.statusWarn, 9), border: `1px solid ${alpha(C.statusWarn, 22)}` }}>برای ثبت درخواست، اول خودرو را اضافه کن.</p>}
      <div className="service-grid">
        {active.map((type, index) => (
          <button key={type} type="button" onClick={() => !disabled && onPick(type)} disabled={disabled} className={`service-card ${index === 0 ? 'featured' : ''}`} style={{ background: C.surfaceSolid, border: `1px solid ${C.borderStrong}`, color: C.textStrong }}>
            <span className="service-icon" style={{ color: index === 0 ? C.statusDanger : C.green, background: alpha(index === 0 ? C.statusDanger : C.green, 10), border: `1px solid ${alpha(index === 0 ? C.statusDanger : C.green, 24)}` }}>{serviceIcon(type)}</span>
            <strong>{type === 'تنظیم موتور' ? 'دیاگ و عیب‌یابی' : type}</strong>
            <small style={{ color: C.muted }}>{index === 0 ? 'خدمت اصلی و پرتقاضا' : 'ثبت سریع درخواست'}</small>
          </button>
        ))}
      </div>
      <div className="soon-box" style={{ background: C.fill2, border: `1px solid ${C.border}` }}>
        <p style={{ color: C.text2 }}>به‌زودی در خدمات ماشین</p>
        <div>{SOON_MACHINE_SERVICES.map(s => <span key={s} style={{ color: C.muted, border: `1px solid ${C.border}` }}>{s}</span>)}</div>
      </div>
    </section>
  );
}

function SoftwareActions({ vehicleId }: { vehicleId?: string }) {
  return (
    <section className="panel" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
      <div className="panel-head"><div><p className="eyebrow" style={{ color: C.statusInfo }}>خدمات نرم‌افزار</p><h2 style={{ color: C.text2 }}>ثبت و مدیریت ماشین</h2></div></div>
      <div className="software-actions">
        <Link href="/vehicles/new" className="software-card" style={{ background: C.surfaceSolid, border: `1px solid ${C.borderStrong}`, color: C.textStrong }}><CarIcon size={20} /><strong>ثبت ماشین</strong><small style={{ color: C.muted }}>اطلاعات و مدارک خودرو</small></Link>
        <Link href="/reminders" className="software-card" style={{ background: C.surfaceSolid, border: `1px solid ${C.borderStrong}`, color: C.textStrong }}><BellIcon size={20} /><strong>یادآوری‌ها</strong><small style={{ color: C.muted }}>بیمه، سرویس، معاینه فنی</small></Link>
        <Link href="/tracking" className="software-card" style={{ background: C.surfaceSolid, border: `1px solid ${C.borderStrong}`, color: C.textStrong }}><CloudIcon size={20} /><strong>ردیابی</strong><small style={{ color: C.muted }}>موقعیت و مسیرها</small></Link>
      </div>
      <QuickEntry vehicleId={vehicleId} />
    </section>
  );
}

function AccountSummary({ user, vehicles, alerts, pct }: { user: { name: string } | null; vehicles: Vehicle[]; alerts: Vehicle[]; pct: number }) {
  const statusColor = alerts.length ? C.statusWarn : C.green;
  return (
    <section className="summary-card" style={{ background: C.surfaceSolid, border: `1px solid ${C.borderStrong}`, boxShadow: C.shadowSoft }}>
      <div><p style={{ color: C.muted, margin: 0, fontSize: 12 }}>وضعیت حساب</p><h2 style={{ color: C.textStrong }}>{user?.name || 'کاربر خودرو'}</h2></div>
      <div className="summary-stats">
        {[{ label: 'خودرو', value: vehicles.length, color: C.green }, { label: 'هشدار', value: alerts.length, color: alerts.length ? C.statusDanger : C.green }, { label: 'سلامت', value: `${pct}%`, color: statusColor }].map(item => <div key={item.label} style={{ background: C.fill2, border: `1px solid ${C.border}` }}><strong style={{ color: item.color }}>{item.value}</strong><span style={{ color: C.muted }}>{item.label}</span></div>)}
      </div>
    </section>
  );
}

function VehicleRow({ v, isLast }: { v: Vehicle; isLast: boolean }) {
  const insDays  = daysUntil(v.insuranceExpiry);
  const tecDays  = daysUntil(v.technicalExpiry);
  const hasAlert = expiryStatus(insDays) !== 'ok' || expiryStatus(tecDays) !== 'ok';
  const color = hasAlert ? C.statusExpired : C.green;
  return (
    <Link href={`/vehicles/${v.id}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div className="vehicle-row" style={{ borderBottom: isLast ? 'none' : `1px solid ${C.border}` }}>
        <div className="vehicle-icon" style={{ background: alpha(color, 12), border: `1px solid ${alpha(color, 25)}`, color }}><CarIcon size={21} /></div>
        <div style={{ flex: 1, minWidth: 0 }}><p style={{ color: C.text, fontSize: 14, fontWeight: 800, margin: 0 }}>{v.make} {v.model}</p><p style={{ color: C.muted, fontSize: 12, margin: '3px 0 0' }}>{v.year}{v.fuelType ? ` · ${v.fuelType}` : ''} · {v.currentMileage.toLocaleString()} km</p></div>
        <span style={{ color, fontSize: 11, fontWeight: 800 }}>{hasAlert ? 'هشدار' : 'سالم'}</span><ChevronLeftIcon size={16} color={C.subtle} />
      </div>
    </Link>
  );
}

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

  const alerts = vehicles.filter(v => expiryStatus(daysUntil(v.insuranceExpiry)) !== 'ok' || expiryStatus(daysUntil(v.technicalExpiry)) !== 'ok');
  const healthy = vehicles.length - alerts.length;
  const pct = vehicles.length ? Math.round((healthy / vehicles.length) * 100) : 100;
  const today = new Date().toLocaleDateString('fa-IR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      <main className="dashboard-main">
        <div className="welcome"><p style={{ color: C.muted }}>{today}</p><h1 style={{ color: C.text }}>{user?.name ? `سلام ${user.name}` : 'خوش آمدی'}</h1></div>
        {loading ? <SkeletonHero /> : <ActionHub vehicles={vehicles} alerts={alerts} onService={setRequestType} />}
        {loading ? <SkeletonHero /> : <AccountSummary user={user} vehicles={vehicles} alerts={alerts} pct={pct} />}
        <MachineServices onPick={setRequestType} disabled={!loading && vehicles.length === 0} />
        <SoftwareActions vehicleId={vehicles[0]?.id} />
        <AgendaPreview />
        <section className="panel" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
          <div className="panel-head"><div><p className="eyebrow" style={{ color: C.green }}>خودروهای من</p><h2 style={{ color: C.text2 }}>ماشین‌ها و وضعیت‌ها</h2></div><Link href="/vehicles/new" style={{ display: 'flex', alignItems: 'center', gap: 4, color: C.green, fontSize: 13, fontWeight: 800, textDecoration: 'none', background: alpha(C.green, 10), border: `1px solid ${alpha(C.green, 22)}`, borderRadius: 10, padding: '6px 12px' }}><PlusIcon size={14} /> افزودن</Link></div>
          {loading ? <div style={{ background: C.surface, borderRadius: 18, overflow: 'hidden' }}><SkeletonRow /><SkeletonRow /></div> : vehicles.length === 0 ? <EmptyState icon={<CarIcon size={30} />} title="هنوز خودرویی ثبت نکردی" sub="اولین خودروت رو اضافه کن تا خدمات ماشین فعال شود" onAdd={() => router.push('/vehicles/new')} btnLabel="افزودن خودرو" /> : <div style={{ background: C.surfaceSolid, border: `1px solid ${C.border}`, borderRadius: 18, overflow: 'hidden' }}>{vehicles.map((v, i) => <VehicleRow key={v.id} v={v} isLast={i === vehicles.length - 1} />)}</div>}
        </section>
        <NetworkGrowingNotice />
      </main>
      {requestType && <RequestServiceModal serviceType={requestType} onClose={() => setRequestType(null)} />}
      <BottomNav />
      <style>{`
        .dashboard-main { max-width: 760px; margin: 0 auto; padding: 0 16px calc(92px + env(safe-area-inset-bottom)); }
        .welcome { padding: 18px 0 14px; }.welcome p { font-size: 12px; margin: 0; font-weight: 600; }.welcome h1 { font-size: 24px; font-weight: 950; margin: 5px 0 0; }
        .action-hub, .summary-card, .panel { border-radius: 24px; margin-bottom: 18px; padding: 18px; }.hub-head, .panel-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 14px; }.eyebrow { margin: 0 0 6px; font-size: 11px; font-weight: 950; }.hub-head h2, .panel-head h2, .summary-card h2 { margin: 0; font-size: 20px; font-weight: 950; }.hub-head p:not(.eyebrow) { margin: 6px 0 0; font-size: 12.5px; line-height: 1.8; }.hub-alert { min-width: 74px; border-radius: 16px; padding: 10px; text-align: center; }.hub-alert strong, .hub-alert span { display: block; }.hub-alert strong { font-size: 24px; }.hub-alert span { font-size: 10.5px; font-weight: 800; }
        .primary-actions { display: grid; grid-template-columns: 1.15fr .925fr .925fr; gap: 10px; }.big-action { min-height: 124px; border-radius: 18px; padding: 14px; text-decoration: none; cursor: pointer; display: flex; flex-direction: column; align-items: flex-start; gap: 8px; font-family: var(--font-sans); text-align: right; }.big-action:disabled { cursor: not-allowed; opacity: .72; }.big-action strong { font-size: 14px; }.big-action small { font-size: 11px; line-height: 1.6; }
        .summary-card { display: flex; align-items: center; justify-content: space-between; gap: 14px; }.summary-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; min-width: 250px; }.summary-stats div { border-radius: 16px; padding: 10px 8px; text-align: center; }.summary-stats strong, .summary-stats span { display: block; }.summary-stats strong { font-size: 20px; }.summary-stats span { font-size: 10.5px; font-weight: 800; margin-top: 3px; }
        .helper { border-radius: 14px; padding: 9px 12px; margin: 0 0 12px; font-size: 12px; font-weight: 800; }.service-grid { display: grid; grid-template-columns: 1.2fr 1fr 1fr 1fr; gap: 10px; }.service-card { border-radius: 18px; min-height: 126px; padding: 13px; display: flex; flex-direction: column; align-items: flex-start; gap: 8px; font-family: var(--font-sans); text-align: right; cursor: pointer; }.service-card:disabled { cursor: not-allowed; opacity: .68; }.service-card.featured { min-height: 150px; }.service-icon { width: 40px; height: 40px; border-radius: 14px; display: grid; place-items: center; }.service-card strong { font-size: 13px; line-height: 1.5; }.service-card small { font-size: 10.5px; line-height: 1.5; }
        .soon-box { margin-top: 12px; border-radius: 18px; padding: 13px; }.soon-box p { margin: 0 0 10px; font-size: 12px; font-weight: 900; }.soon-box div { display: flex; flex-wrap: wrap; gap: 8px; }.soon-box span { border-radius: 999px; padding: 7px 10px; font-size: 11px; font-weight: 800; }
        .software-actions { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 12px; }.software-card { border-radius: 18px; padding: 14px; min-height: 116px; text-decoration: none; display: flex; flex-direction: column; align-items: flex-start; gap: 8px; }.software-card svg { color: var(--status-info); }.software-card strong { font-size: 13.5px; }.software-card small { font-size: 11px; line-height: 1.55; }.vehicle-row { display: flex; align-items: center; gap: 12px; padding: 13px 14px; }.vehicle-icon { width: 44px; height: 44px; border-radius: 15px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
        @media (max-width: 680px) { .dashboard-main { max-width: 520px; } .primary-actions, .service-grid, .software-actions, .summary-card { grid-template-columns: 1fr; display: grid; } .summary-stats { min-width: 0; width: 100%; } .hub-head, .panel-head { align-items: flex-start; } }
      `}</style>
    </div>
  );
}
