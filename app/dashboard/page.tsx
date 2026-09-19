"use client";
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import ServiceCard from '@/components/ServiceCard';
import ThemeToggle from '@/components/ThemeToggle';
import NotificationsBell from '@/components/NotificationsBell';
import { api, Appointment, PresetService, Vehicle, daysUntil, expiryStatus, toJalali } from '@/lib/api';
import { C, alpha, EmptyState, SkeletonRow } from '@/components/ui';
import {
  BellIcon, CalendarIcon, CarIcon, ChevronLeftIcon, ClockIcon, DropletIcon, NavigationIcon,
  PaperclipIcon, SearchIcon, SettingsIcon, SparklesIcon, StoreIcon, WalletIcon, WrenchIcon,
} from '@/components/icons';

/**
 * The end-user home, laid out like the reference template: greeting, one
 * search, a row of category tiles, then a grid of service cards that lead into
 * an order screen. The services are read from the catalogue the admin panel
 * manages, so the grid is the real product rather than a set of placeholders.
 */

/** One tile per catalogue category, plus the icon each should wear. */
const CATEGORY_ICON: Record<string, React.ReactNode> = {
  'سرویس دوره‌ای': <DropletIcon size={22} />,
  'تعمیرات': <WrenchIcon size={22} />,
  'خدمات تکمیلی': <SparklesIcon size={22} />,
};

const SHORTCUTS = [
  { href: '/vehicles',   label: 'خودروها', icon: <CarIcon size={19} />,        hue: 'var(--svc-tire)' },
  { href: '/vehicles',   label: 'مدارک',   icon: <PaperclipIcon size={19} />,  hue: 'var(--svc-filter)' },
  { href: '/expenses',   label: 'هزینه‌ها', icon: <WalletIcon size={19} />,     hue: 'var(--svc-oil)' },
  { href: '/tracking',   label: 'ردیابی',  icon: <NavigationIcon size={19} />, hue: 'var(--svc-gearbox)' },
  { href: '/requests',   label: 'درخواست‌ها', icon: <SparklesIcon size={19} />,  hue: 'var(--svc-tuning)' },
];

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<{ name?: string } | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [services, setServices] = useState<PresetService[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');

  useEffect(() => {
    if (!localStorage.getItem('vtoken')) { router.replace('/'); return; }
    try { setUser(JSON.parse(localStorage.getItem('vuser') || '{}')); } catch { /* no cached user */ }
    api.vehicles.list().then(setVehicles).catch(() => {}).finally(() => setLoading(false));
    api.catalog.publicServices()
      .then((res) => { setServices(res.items); setCategories(res.categories); })
      .catch(() => {})
      .finally(() => setServicesLoading(false));
    api.appointments.mine().then(setAppts).catch(() => {});
  }, [router]);

  const alerts = vehicles.filter(
    (v) => expiryStatus(daysUntil(v.insuranceExpiry)) !== 'ok' || expiryStatus(daysUntil(v.technicalExpiry)) !== 'ok',
  );

  const shown = useMemo(() => {
    const needle = q.trim();
    return services.filter((s) => {
      if (cat && s.category !== cat) return false;
      if (!needle) return true;
      return `${s.customName ?? ''} ${s.serviceType} ${s.category}`.includes(needle);
    });
  }, [services, q, cat]);

  // خدماتی که واقعاً ارائه می‌شوند اول می‌آیند؛ بقیه زیر یک تیتر «به‌زودی».
  const live = useMemo(() => shown.filter((s) => s.availableNow !== false), [shown]);
  const soon = useMemo(() => shown.filter((s) => s.availableNow === false), [shown]);


  const firstName = (user?.name || '').split(' ')[0];
  /* the soonest booking that has not already happened */
  const nextAppt = appts
    .filter((a) => ['pending', 'confirmed'].includes(a.status) && new Date(a.requestedAt).getTime() >= Date.now() - 864e5)
    .sort((a, b) => +new Date(a.requestedAt) - +new Date(b.requestedAt))[0];
  const countIn = (c: string) => services.filter((s) => s.category === c).length;

  return (
    <div className="home">
      <main className="home-main">
        {/* ── greeting ── */}
        <header className="greet">
          <div>
            <h1 style={{ color: C.textStrong }}>{firstName ? `سلام ${firstName}` : 'خوش آمدی'}</h1>
            <p style={{ color: C.muted }}>چه کمکی لازم داری؟</p>
          </div>
          <div className="greet-side">
            <NotificationsBell />
            <ThemeToggle size={38} />
            <Link href="/profile" className="avatar" style={{ background: `linear-gradient(135deg, ${C.green}, ${C.greenDark})`, color: C.onAccent }}>
              {(firstName || 'ک').slice(0, 1)}
            </Link>
          </div>
        </header>

        {/* ── the owner's own state, before anything asks them to browse ── */}
        {(nextAppt || alerts.length > 0) && (
          <div className="status">
            {nextAppt && (
              <Link href="/appointments" className="status-card" style={{ background: alpha(C.statusMint, 10), boxShadow: C.shadowSoft }}>
                <span style={{ background: alpha(C.statusMint, 16), color: C.statusMint }}><CalendarIcon size={19} /></span>
                <div>
                  <b style={{ color: C.textStrong }}>نوبت بعدی</b>
                  <small style={{ color: C.text2 }}>
                    {toJalali(nextAppt.requestedAt.slice(0, 10))}
                    {nextAppt.serviceType ? ` · ${nextAppt.serviceType}` : ''}
                  </small>
                </div>
                <ChevronLeftIcon size={16} color={C.subtle} />
              </Link>
            )}
            {alerts.length > 0 && (
              <Link href="/reminders" className="status-card" style={{ background: alpha(C.statusExpired, 9), boxShadow: C.shadowSoft }}>
                <span style={{ background: alpha(C.statusExpired, 15), color: C.statusExpired }}><BellIcon size={19} /></span>
                <div>
                  <b style={{ color: C.textStrong }}>{alerts.length.toLocaleString('fa-IR')} مدرک نزدیک سررسید</b>
                  <small style={{ color: C.text2 }}>بیمه یا معاینه فنی به موعد نزدیک شده</small>
                </div>
                <ChevronLeftIcon size={16} color={C.subtle} />
              </Link>
            )}
          </div>
        )}

        {/* ── search ── */}
        <div className="search" style={{ background: C.fill2, border: `1px solid ${C.border}` }}>
          <SearchIcon size={18} color={C.muted} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجوی خدمت..." style={{ color: C.textStrong }} />
          {q && <button type="button" onClick={() => setQ('')} style={{ color: C.muted }}>✕</button>}
        </div>

        {/* ── category tiles ── */}
        {categories.length > 0 && (
          <div className="tiles">
            {categories.map((c) => {
              const on = cat === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCat(on ? '' : c)}
                  className={`tile ${on ? 'on' : ''}`}
                  style={{
                    background: on ? `linear-gradient(160deg, ${C.green}, ${C.greenDark})` : C.surfaceSolid,
                    boxShadow: on ? C.shadowBrand : C.shadowSoft,
                    color: on ? C.onAccent : C.text2,
                  }}
                >
                  <span className="tile-art" style={{ background: on ? C.onAccent : C.fill2, color: C.green }}>
                    {CATEGORY_ICON[c] ?? <SettingsIcon size={22} />}
                  </span>
                  <b>{c}</b>
                  <small style={{ color: on ? 'rgba(255,255,255,.75)' : C.subtle }}>
                    {countIn(c).toLocaleString('fa-IR')} خدمت
                  </small>
                </button>
              );
            })}
          </div>
        )}

        {/* ── the service grid ── */}
        <div className="row-head">
          <h2 style={{ color: C.textStrong }}>خدمات ما</h2>
          {cat && <button type="button" onClick={() => setCat('')} style={{ color: C.green }}>نمایش همه</button>}
        </div>

        {servicesLoading ? (
          <div className="svc-grid">{[0, 1, 2, 3].map((i) => <div key={i} className="svc-skel" style={{ background: C.fill2 }} />)}</div>
        ) : shown.length === 0 ? (
          <p className="none" style={{ color: C.muted }}>خدمتی با این جستجو پیدا نشد.</p>
        ) : (
          <>
            {live.length > 0 && (
              <div className="svc-grid">
                {live.map((s, i) => (
                  <ServiceCard
                    key={s.key}
                    s={s}
                    index={i}
                    href={`/order/${encodeURIComponent(s.key)}`}
                  />
                ))}
              </div>
            )}

            {soon.length > 0 && (
              <div className="soon-block">
                <p className="soon-title" style={{ color: C.text2 }}>
                  <ClockIcon size={14} />
                  به‌زودی اضافه می‌شود
                  <span style={{ color: C.muted }}>{soon.length.toLocaleString('fa-IR')} خدمت</span>
                </p>
                <ul className="soon-list">
                  {soon.map((s) => (
                    <li key={s.key} style={{ background: C.fill2, color: C.text2 }}>
                      {s.customName || s.serviceType}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {/* ── the other way in: describe the job, let workshops answer ── */}
        <Link href="/requests/new" className="promo" style={{ background: C.surfaceSolid, boxShadow: C.shadowSoft }}>
          <span className="promo-art" style={{ background: alpha(C.statusMint, 13), color: C.statusMint }}><SparklesIcon size={26} /></span>
          <div>
            <b style={{ color: C.textStrong }}>نمی‌دانی کدام تعمیرگاه؟</b>
            <p style={{ color: C.muted }}>بگو ماشینت چه می‌خواهد؛ تعمیرگاه‌ها قیمت و زمان می‌دهند و تو انتخاب می‌کنی.</p>
          </div>
          <i style={{ background: `linear-gradient(135deg, ${C.green}, ${C.greenDark})`, color: C.onAccent, boxShadow: C.shadowBrand }}>
            <ChevronLeftIcon size={18} />
          </i>
        </Link>

        {/* ── promo ── */}
        <Link href="/workshops" className="promo" style={{ background: C.surfaceSolid, boxShadow: C.shadowSoft }}>
          <span className="promo-art" style={{ background: alpha(C.green, 12), color: C.green }}><StoreIcon size={26} /></span>
          <div>
            <b style={{ color: C.textStrong }}>تعمیرگاه‌های نزدیک تو</b>
            <p style={{ color: C.muted }}>امتیاز و فاصله را ببین و مستقیم نوبت بگیر.</p>
          </div>
          <i style={{ background: `linear-gradient(135deg, ${C.green}, ${C.greenDark})`, color: C.onAccent, boxShadow: C.shadowBrand }}>
            <ChevronLeftIcon size={18} />
          </i>
        </Link>

        {/* ── shortcuts into the user's own data ── */}
        <div className="row-head"><h2 style={{ color: C.textStrong }}>میان‌بُرها</h2></div>
        <div className="shortcuts">
          {SHORTCUTS.map((x) => (
            <Link key={x.label} href={x.href} className="shortcut" style={{ background: C.surfaceSolid, boxShadow: C.shadowSoft }}>
              <span style={{ color: x.hue, background: alpha(x.hue, 11) }}>{x.icon}</span>
              <b style={{ color: C.text }}>{x.label}</b>
            </Link>
          ))}
        </div>

        {/* ── the user's cars ── */}
        <div className="row-head">
          <h2 style={{ color: C.textStrong }}>خودروهای من</h2>
          <Link href="/vehicles/new" style={{ color: C.green }}>افزودن</Link>
        </div>

        {loading ? (
          <div style={{ background: C.surfaceSolid, borderRadius: 22, overflow: 'hidden' }}><SkeletonRow /><SkeletonRow /></div>
        ) : vehicles.length === 0 ? (
          <EmptyState
            icon={<CarIcon size={30} />}
            title="هنوز خودرویی ثبت نکردی"
            sub="با ثبت خودرو، درخواست خدمت و یادآوری مدارک فعال می‌شود"
            onAdd={() => router.push('/vehicles/new')}
            btnLabel="افزودن خودرو"
          />
        ) : (
          <div className="cars">
            {vehicles.map((v) => {
              const bad = expiryStatus(daysUntil(v.insuranceExpiry)) !== 'ok' || expiryStatus(daysUntil(v.technicalExpiry)) !== 'ok';
              const hue = bad ? C.statusExpired : C.statusOk;
              return (
                <Link key={v.id} href={`/vehicles/${v.id}`} className="car" style={{ background: C.surfaceSolid, boxShadow: C.shadowSoft }}>
                  <span style={{ color: hue, background: alpha(hue, 11) }}><CarIcon size={21} /></span>
                  <div>
                    <b style={{ color: C.textStrong }}>{v.make} {v.model}</b>
                    <small style={{ color: C.muted }}>
                      {v.year.toLocaleString('fa-IR', { useGrouping: false })} · {v.currentMileage.toLocaleString('fa-IR')} کیلومتر
                    </small>
                  </div>
                  <em style={{ color: hue, background: alpha(hue, 10) }}>{bad ? 'بررسی' : 'سالم'}</em>
                  <ChevronLeftIcon size={16} color={C.subtle} />
                </Link>
              );
            })}
            {alerts.length > 0 && (
              <Link href="/reminders" className="alert-line" style={{ color: C.statusExpired, background: alpha(C.statusExpired, 9), border: `1px solid ${alpha(C.statusExpired, 22)}` }}>
                {alerts.length.toLocaleString('fa-IR')} خودرو مدرک نزدیک به سررسید دارد
              </Link>
            )}
          </div>
        )}
      </main>

      <BottomNav />

      <style>{`
.home{min-height:100vh;background:var(--bg-gradient)}
.home-main{max-width:900px;margin:0 auto;padding:8px 16px calc(104px + env(safe-area-inset-bottom))}
.greet{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:14px 2px 18px}
.greet h1{margin:0;font-size:24px;font-weight:950;letter-spacing:-.5px}
.greet p{margin:5px 0 0;font-size:13px;font-weight:700}
.greet-side{display:flex;align-items:center;gap:8px;flex-shrink:0}
.avatar{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;font:900 17px var(--font-sans);text-decoration:none;flex-shrink:0}
.status{display:grid;gap:var(--sp-2);margin-bottom:var(--sp-3)}
.status-card{display:flex;align-items:center;gap:var(--sp-3);border-radius:var(--r-row);padding:13px 14px;text-decoration:none;transition:transform .16s ease}
.status-card:hover{transform:translateY(-2px)}
.status-card>span{width:42px;height:42px;border-radius:var(--r-plate);display:grid;place-items:center;flex-shrink:0}
.status-card>div{flex:1;min-width:0}
.status-card b{display:block;font-size:13.5px;font-weight:900}
.status-card small{display:block;font-size:11.5px;margin-top:2px}
.search{display:flex;align-items:center;gap:10px;border-radius:16px;padding:13px 15px;margin-bottom:18px}
.search input{flex:1;min-width:0;border:0;outline:0;background:transparent;font:700 14px var(--font-sans);padding:11px 0;margin:-11px 0}
.search button{border:0;background:transparent;cursor:pointer;font-size:13px}
.tiles{display:flex;align-items:stretch;gap:10px;overflow-x:auto;scrollbar-width:none;padding:2px 2px 6px;margin-bottom:6px}
.tiles::-webkit-scrollbar{display:none}
.tile{flex:0 0 auto;width:104px;border-radius:20px;padding:14px 10px;cursor:pointer;font-family:var(--font-sans);display:flex;flex-direction:column;align-items:center;gap:3px;align-self:flex-end;transition:transform .18s cubic-bezier(.16,1,.3,1),padding .18s ease}
.tile:active{transform:scale(.97)}
.tile-art{width:46px;height:46px;border-radius:13px;display:grid;place-items:center;margin-bottom:5px;transition:background .18s ease}
.tile.on{padding:22px 10px 17px}
.tile b{font-size:12px;font-weight:900;text-align:center;line-height:1.4;min-height:34px;display:flex;align-items:center}
.tile small{font-size:10px;font-weight:800}
.row-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin:20px 2px 12px}
.row-head h2{margin:0;font-size:17px;font-weight:950}
.row-head a,.row-head button{font-size:12.5px;font-weight:800;text-decoration:none;border:0;background:transparent;cursor:pointer;font-family:var(--font-sans)}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.55}}
.none{font-size:13px;text-align:center;padding:26px 0}
.promo{display:flex;align-items:center;gap:13px;border-radius:20px;padding:15px;text-decoration:none;margin-top:18px}
.promo-art{width:52px;height:52px;border-radius:18px;display:grid;place-items:center;flex-shrink:0}
.promo div{flex:1;min-width:0}
.promo b{font-size:14.5px;font-weight:950;display:block}
.promo p{font-size:12px;line-height:1.75;margin:4px 0 0}
.promo i{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;flex-shrink:0}
.shortcuts{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.shortcut{border-radius:18px;padding:13px 8px;text-decoration:none;display:grid;justify-items:center;gap:7px;transition:transform .16s ease}
.shortcut:hover{transform:translateY(-2px)}
.shortcut span{width:40px;height:40px;border-radius:14px;display:grid;place-items:center}
.shortcut b{font-size:11px;font-weight:850;text-align:center}
.cars{display:grid;gap:10px}
.car{display:flex;align-items:center;gap:12px;border-radius:18px;padding:13px 14px;text-decoration:none}
.car>span{width:44px;height:44px;border-radius:15px;display:grid;place-items:center;flex-shrink:0}
.car>div{flex:1;min-width:0}
.car b,.car small{display:block}
.car b{font-size:14px;font-weight:900}
.car small{font-size:11.5px;margin-top:3px}
.car em{font-style:normal;font-size:11px;font-weight:900;border-radius:999px;padding:5px 10px;white-space:nowrap}
.alert-line{border-radius:16px;padding:11px 14px;font:800 12px var(--font-sans);text-decoration:none;text-align:center}
@media(max-width:400px){.shortcuts{grid-template-columns:repeat(2,1fr)}}
      `}</style>
    </div>
  );
}
