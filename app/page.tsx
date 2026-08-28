"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, Role } from '@/lib/api';
import { alpha, Button, C, Input } from '@/components/ui';
import ThemeToggle from '@/components/ThemeToggle';
import {
  BatteryIcon, BellIcon, CalendarIcon, CarIcon, CheckIcon, CloudIcon, DiscIcon,
  DropletIcon, FuelIcon, GaugeIcon, LockIcon, PaintbrushIcon, RoadIcon, SearchIcon,
  ShieldIcon, SnowflakeIcon, StoreIcon, UserIcon, WrenchIcon, ZapIcon,
} from '@/components/icons';

function homeFor(role: Role): string {
  if (role === 'mechanic') return '/mechanic';
  if (role === 'seller') return '/seller/products';
  return '/dashboard';
}

type CardTone = { color: string; bg: string; border: string };
type ServiceItem = { title: string; text: string; detail: string; status: 'فعال' | 'به‌زودی'; icon: React.ReactNode; tone: CardTone };
type ActionCard = { title: string; text: string; cta: string; icon: React.ReactNode; tone: CardTone };

const tones = {
  green: { color: C.green, bg: alpha(C.green, 11), border: alpha(C.green, 28) },
  red: { color: C.statusDanger, bg: alpha(C.statusDanger, 10), border: alpha(C.statusDanger, 24) },
  blue: { color: C.statusInfo, bg: alpha(C.statusInfo, 10), border: alpha(C.statusInfo, 24) },
  warn: { color: C.statusWarn, bg: alpha(C.statusWarn, 11), border: alpha(C.statusWarn, 26) },
  mint: { color: C.statusMint, bg: alpha(C.statusMint, 10), border: alpha(C.statusMint, 24) },
};

const audienceCards: ActionCard[] = [
  { title: 'مالک خودرو', text: 'ثبت ماشین، درخواست خدمت، یادآوری و پیگیری هزینه‌ها از یک داشبورد ساده.', cta: 'شروع به عنوان مالک', icon: <UserIcon size={24} />, tone: tones.green },
  { title: 'مکانیک و تعمیرگاه', text: 'درخواست‌های جدید، مشتری‌ها، خدمات و حسابداری همیشه در دسترس.', cta: 'ثبت تعمیرگاه', icon: <WrenchIcon size={24} />, tone: tones.blue },
  { title: 'فروشنده قطعه', text: 'کالا، فروش و حسابداری فروشگاه با مسیر کوتاه و بدون صفحه‌های اضافه.', cta: 'ثبت فروشگاه', icon: <StoreIcon size={24} />, tone: tones.warn },
];

const activeServices: ServiceItem[] = [
  { title: 'تعویض باتری در محل', text: 'ثبت سریع درخواست باتری، هماهنگی تکنسین و پیگیری تا پایان کار.', detail: 'مناسب خرابی ناگهانی، باتری ضعیف و روشن نشدن خودرو', status: 'فعال', icon: <BatteryIcon size={26} />, tone: tones.red },
  { title: 'دیاگ و عیب‌یابی', text: 'بررسی چراغ چک، خطاهای موتور و عیب‌یابی اولیه قبل از تعمیر.', detail: 'برای کاهش هزینه تعمیر و تصمیم سریع‌تر', status: 'فعال', icon: <GaugeIcon size={26} />, tone: tones.blue },
  { title: 'سرویس و تعمیر خودرو', text: 'سرویس دوره‌ای، تعمیرگاه، سوابق تعمیر و هزینه‌ها در یک مسیر مشخص.', detail: 'برای نگهداری کامل خودرو و مدیریت مراجعه‌ها', status: 'فعال', icon: <WrenchIcon size={26} />, tone: tones.green },
];

const upcomingServices: ServiceItem[] = [
  { title: 'تعویض روغن', text: 'ثبت سررسید و درخواست سرویس روغن و فیلترها.', detail: 'به‌زودی', status: 'به‌زودی', icon: <DropletIcon size={23} />, tone: tones.warn },
  { title: 'لاستیک و پنچرگیری', text: 'پنچرگیری، تعویض لاستیک و سرویس چرخ‌ها.', detail: 'به‌زودی', status: 'به‌زودی', icon: <DiscIcon size={23} />, tone: tones.blue },
  { title: 'کارواش و دیتیلینگ', text: 'رزرو شست‌وشو، صفرشویی و خدمات زیبایی خودرو.', detail: 'به‌زودی', status: 'به‌زودی', icon: <SparkleShim />, tone: tones.mint },
  { title: 'کولر و برق خودرو', text: 'سرویس کولر، برق، دینام و خطاهای برقی.', detail: 'به‌زودی', status: 'به‌زودی', icon: <SnowflakeIcon size={23} />, tone: tones.blue },
  { title: 'صافکاری و بدنه', text: 'بررسی بدنه، رنگ، صافکاری و تخمین هزینه.', detail: 'به‌زودی', status: 'به‌زودی', icon: <PaintbrushIcon size={23} />, tone: tones.red },
  { title: 'امداد جاده‌ای', text: 'درخواست کمک فوری در مسیر و اتصال به امدادگر.', detail: 'به‌زودی', status: 'به‌زودی', icon: <RoadIcon size={23} />, tone: tones.green },
  { title: 'سوخت و مصرف', text: 'ثبت هزینه سوخت و تحلیل مصرف ماشین.', detail: 'به‌زودی', status: 'به‌زودی', icon: <FuelIcon size={23} />, tone: tones.warn },
  { title: 'باتری و برق پیشرفته', text: 'تست دینام، برق‌دزدی و سلامت سیستم برق.', detail: 'به‌زودی', status: 'به‌زودی', icon: <ZapIcon size={23} />, tone: tones.mint },
];

function SparkleShim() { return <ShieldIcon size={23} />; }

const softwareServices = [
  { title: 'ثبت ماشین', text: 'پلاک، مدل، کیلومتر، بیمه و معاینه فنی را جدا از خدمات ماشین ثبت کن.', icon: <CarIcon size={20} /> },
  { title: 'یادآوری‌ها', text: 'قبل از موعد بیمه، سرویس، معاینه فنی و هزینه‌ها خبر بگیر.', icon: <BellIcon size={20} /> },
  { title: 'ردیابی و سوابق', text: 'مسیرها، سوابق سرویس و وضعیت خودرو برای تصمیم بهتر.', icon: <CloudIcon size={20} /> },
];

function scrollToLogin(mode?: 'login' | 'register', role?: Role) {
  if (mode) window.dispatchEvent(new CustomEvent('vehicle:set-auth-mode', { detail: { mode, role } }));
  document.getElementById('login')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function PathCard({ card, role }: { card: ActionCard; role: Role }) {
  return <button className="path-card" type="button" onClick={() => scrollToLogin('register', role)} style={{ background: C.surfaceSolid, border: `1px solid ${C.borderStrong}`, boxShadow: C.shadowSoft }}><span className="path-icon" style={{ color: card.tone.color, background: card.tone.bg, border: `1px solid ${card.tone.border}` }}>{card.icon}</span><span className="path-title" style={{ color: C.textStrong }}>{card.title}</span><span className="path-text" style={{ color: C.text2 }}>{card.text}</span><span className="path-cta" style={{ color: card.tone.color }}>{card.cta}</span></button>;
}

function ServiceCard({ item, available }: { item: ServiceItem; available: boolean }) {
  return (
    <button type="button" className={`service-card ${available ? 'available' : 'upcoming'}`} onClick={() => available && scrollToLogin('register', 'owner')} disabled={!available} style={{ background: C.surfaceSolid, border: `1px solid ${available ? item.tone.border : C.border}`, boxShadow: available ? C.shadowCard : 'none' }}>
      <span className="service-visual" style={{ background: item.tone.bg, color: item.tone.color, border: `1px solid ${item.tone.border}` }}>{item.icon}</span>
      <span className="service-meta"><span className="service-status" style={{ color: available ? item.tone.color : C.statusWarn, background: available ? item.tone.bg : alpha(C.statusWarn, 10), border: `1px solid ${available ? item.tone.border : alpha(C.statusWarn, 24)}` }}>{item.status}</span></span>
      <strong style={{ color: C.textStrong }}>{item.title}</strong>
      <p style={{ color: C.text2 }}>{item.text}</p>
      <small style={{ color: C.muted }}>{item.detail}</small>
      <span className="service-action" style={{ color: available ? item.tone.color : C.muted }}>{available ? 'ثبت درخواست' : 'در نقشه توسعه'} <CheckIcon size={14} /></span>
    </button>
  );
}

function ProductMap() {
  return <section className="product-map" style={{ background: C.surfaceSolid, border: `1px solid ${C.borderStrong}`, boxShadow: C.shadowHero }}><div className="section-eyebrow" style={{ color: C.green }}><SearchIcon size={15} /> نقشه ساده برنامه</div><h2 style={{ color: C.textStrong }}>دو بخش جدا؛ خدمات کامل‌تر</h2><div className="map-grid"><div className="map-column strong" style={{ background: alpha(C.green, 8), border: `1px solid ${alpha(C.green, 24)}` }}><span style={{ color: C.green }}>۱</span><strong style={{ color: C.textStrong }}>خدمات ماشین</strong><p style={{ color: C.text2 }}>هر خدمت کارت خودش را دارد؛ فعال‌ها قابل ثبت، آینده‌ها مشخص.</p></div><div className="map-column" style={{ background: C.fill2, border: `1px solid ${C.border}` }}><span style={{ color: C.statusInfo }}>۲</span><strong style={{ color: C.textStrong }}>خدمات نرم‌افزار</strong><p style={{ color: C.text2 }}>ثبت خودرو، مدارک، یادآوری، ردیابی و سوابق جدا از درخواست خدمت.</p></div><div className="map-column" style={{ background: C.fill2, border: `1px solid ${C.border}` }}><span style={{ color: C.statusWarn }}>۳</span><strong style={{ color: C.textStrong }}>پنل نقش‌ها</strong><p style={{ color: C.text2 }}>مالک، مکانیک و فروشنده بعد از ورود مستقیم به فضای خودش می‌رود.</p></div></div></section>;
}

function AuthCard() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('owner');
  const [workshopName, setWorkshopName] = useState('');
  const [workshopAddress, setWorkshopAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  function editPhone() { setOtpSent(false); setCode(''); setError(''); }
  useEffect(() => { const listener = (event: Event) => { const detail = (event as CustomEvent<{ mode?: 'login' | 'register'; role?: Role } | 'login' | 'register'>).detail; const nextMode = typeof detail === 'string' ? detail : detail?.mode; const nextRole = typeof detail === 'string' ? undefined : detail?.role; if (nextMode === 'login' || nextMode === 'register') { setMode(nextMode); editPhone(); } if (nextRole) setRole(nextRole); }; window.addEventListener('vehicle:set-auth-mode', listener); return () => window.removeEventListener('vehicle:set-auth-mode', listener); }, []);
  useEffect(() => { if (!localStorage.getItem('vtoken')) return; try { const u = JSON.parse(localStorage.getItem('vuser') || '{}'); router.replace(homeFor(u.role)); } catch { router.replace('/dashboard'); } }, [router]);
  useEffect(() => { if (cooldown <= 0) return; const t = setTimeout(() => setCooldown(c => c - 1), 1000); return () => clearTimeout(t); }, [cooldown]);
  async function sendOtp() { setError(''); setOtpLoading(true); try { await api.auth.requestOtp(phone); setOtpSent(true); setCooldown(60); } catch (err: any) { setError(err.message); } finally { setOtpLoading(false); } }
  async function submit(e: React.FormEvent) { e.preventDefault(); if (!otpSent) return sendOtp(); setLoading(true); setError(''); try { const res = mode === 'login' ? await api.auth.login(phone, code) : await api.auth.register({ phone, code, name, role, workshopName, workshopAddress }); localStorage.setItem('vtoken', res.access_token); localStorage.setItem('vuser', JSON.stringify(res.user)); router.push(homeFor(res.user.role)); } catch (err: any) { setError(err.message); } finally { setLoading(false); } }
  const roles = [{ v: 'owner' as const, label: 'مالک خودرو', text: 'خدمات و مدیریت ماشین', icon: <CarIcon size={17} /> }, { v: 'mechanic' as const, label: 'مکانیک', text: 'درخواست‌ها و مشتری‌ها', icon: <WrenchIcon size={17} /> }, { v: 'seller' as const, label: 'فروشنده', text: 'قطعات و فروش', icon: <StoreIcon size={17} /> }];
  return <section id="login" className="auth-layout"><div className="auth-copy"><div className="section-eyebrow" style={{ color: C.green }}><LockIcon size={15} /> ورود و ثبت‌نام ساده</div><h2 style={{ color: C.textStrong }}>اول نقش را انتخاب کن؛ بعد فقط شماره موبایل</h2><p style={{ color: C.text2 }}>کاربر نهایی، مکانیک و فروشنده مسیر جدا دارند. بعد از تأیید پیامک، هرکس مستقیم وارد پنل خودش می‌شود.</p></div><div className="auth-card" style={{ background: C.surfaceSolid, border: `1px solid ${C.borderStrong}`, boxShadow: C.shadowCard }}><div className="auth-switch" style={{ background: C.fill1, border: `1px solid ${C.border}` }}>{(['login', 'register'] as const).map(m => <button key={m} type="button" onClick={() => { setMode(m); editPhone(); }} style={{ background: mode === m ? C.textStrong : 'transparent', color: mode === m ? C.bg : C.muted }}>{m === 'login' ? 'ورود' : 'ثبت‌نام'}</button>)}</div>{mode === 'register' && <div className="role-grid">{roles.map(opt => <button key={opt.v} type="button" onClick={() => setRole(opt.v)} style={{ background: role === opt.v ? alpha(C.green, 13) : C.fill2, border: `1px solid ${role === opt.v ? alpha(C.green, 45) : C.border}`, color: role === opt.v ? C.textStrong : C.text2 }}><span style={{ color: role === opt.v ? C.green : C.muted }}>{opt.icon}</span><strong>{opt.label}</strong><small style={{ color: C.muted }}>{opt.text}</small></button>)}</div>}<form onSubmit={submit} className="auth-form">{mode === 'register' && <Input value={name} onChange={e => setName(e.target.value)} placeholder="نام و نام خانوادگی" required />}{mode === 'register' && (role === 'mechanic' || role === 'seller') && <div className="compact-fields"><Input value={workshopName} onChange={e => setWorkshopName(e.target.value)} placeholder={role === 'mechanic' ? 'نام تعمیرگاه' : 'نام فروشگاه'} required /><Input value={workshopAddress} onChange={e => setWorkshopAddress(e.target.value)} placeholder="آدرس یا محدوده فعالیت" /></div>}<Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="شماره موبایل: 09123456789" type="tel" required readOnly={otpSent} dir="ltr" style={{ textAlign: 'left', opacity: otpSent ? 0.7 : 1 }} />{otpSent && <div className="otp-row"><Input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="کد ۴ رقمی" inputMode="numeric" autoFocus required dir="ltr" style={{ textAlign: 'center', letterSpacing: 4, fontSize: 18 }} /><button type="button" onClick={sendOtp} disabled={cooldown > 0 || otpLoading} style={{ color: cooldown > 0 ? C.muted : C.green }}>{cooldown > 0 ? `${cooldown} ثانیه` : 'ارسال مجدد'}</button></div>}{otpSent && <button type="button" onClick={editPhone} className="edit-phone" style={{ color: C.green }}>ویرایش شماره موبایل</button>}{error && <div className="form-error" style={{ color: C.statusExpired, background: alpha(C.statusExpired, 10), border: `1px solid ${alpha(C.statusExpired, 22)}` }}>{error}</div>}<Button type="submit" loading={otpSent ? loading : otpLoading} fullWidth size="lg">{!otpSent ? 'دریافت کد و ادامه' : (mode === 'login' ? 'ورود به برنامه' : 'ساخت حساب و ورود')}</Button></form></div></section>;
}

export default function LandingPage() {
  return (
    <main className="landing-page">
      <header className="topbar" style={{ background: C.navBg, borderBottom: `1px solid ${C.border}` }}><div className="topbar-inner"><div className="brand"><span className="brand-icon" style={{ color: C.green, background: alpha(C.green, 12), border: `1px solid ${alpha(C.green, 30)}` }}><CarIcon size={22} /></span><div><strong style={{ color: C.textStrong }}>دستیار خودرو</strong><small style={{ color: C.muted }}>خدمات ماشین + نرم‌افزار مدیریت خودرو</small></div></div><nav><button type="button" onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })} style={{ color: C.text2 }}>خدمات ماشین</button><button type="button" onClick={() => document.getElementById('software')?.scrollIntoView({ behavior: 'smooth' })} style={{ color: C.text2 }}>خدمات نرم‌افزار</button><button type="button" onClick={() => scrollToLogin('login')} style={{ color: C.text2 }}>ورود</button><ThemeToggle size={38} /></nav></div></header>
      <section className="hero-section"><div className="hero-copy"><div className="section-eyebrow" style={{ color: C.green }}><ShieldIcon size={15} /> طراحی خدمات کارت‌محور</div><h1 style={{ color: C.textStrong }}>هر خدمت، کارت خودش؛ فعال و به‌زودی کاملاً جدا</h1><p style={{ color: C.text2 }}>کاربر در همان نگاه اول می‌بیند کدام خدمات الان قابل استفاده‌اند و کدام خدمات در مسیر توسعه هستند. خدمات ماشین از خدمات نرم‌افزاری جداست و هر نقش مسیر کوتاه خودش را دارد.</p><div className="hero-actions"><Button size="lg" onClick={() => scrollToLogin('register')} icon={<CheckIcon size={17} />}>شروع سریع</Button><Button size="lg" variant="secondary" onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })} icon={<SearchIcon size={17} />}>دیدن کارت خدمات</Button></div><div className="trust-row">{['کارت جدا برای هر خدمت', 'تفکیک فعال و به‌زودی', 'مسیر کوتاه برای هر نقش'].map(item => <span key={item} style={{ color: C.muted }}><CheckIcon size={13} style={{ color: C.green }} />{item}</span>)}</div></div><ProductMap /></section>
      <section className="audience-section"><div className="section-header"><div className="section-eyebrow" style={{ color: C.green }}><UserIcon size={15} /> مسیر شروع برای هر کاربر</div><h2 style={{ color: C.textStrong }}>از همان صفحه اول نقش مشخص است</h2><p style={{ color: C.text2 }}>مالک، مکانیک و فروشنده با یک کلیک وارد مسیر مناسب خودشان می‌شوند.</p></div><div className="path-grid">{audienceCards.map((card, i) => <PathCard key={card.title} card={card} role={i === 1 ? 'mechanic' : i === 2 ? 'seller' : 'owner'} />)}</div></section>
      <section id="services" className="services-section"><div className="section-header"><div className="section-eyebrow" style={{ color: C.green }}><WrenchIcon size={15} /> خدمات ماشین فعال</div><h2 style={{ color: C.textStrong }}>خدمات فعلی؛ هرکدام با کارت کامل و CTA مستقیم</h2><p style={{ color: C.text2 }}>این خدمات آماده استفاده‌اند و کاربر با زدن روی کارت وارد مسیر ثبت درخواست می‌شود.</p></div><div className="services-grid active-grid">{activeServices.map(service => <ServiceCard key={service.title} item={service} available />)}</div></section>
      <section className="soon-section"><div className="section-header compact"><div className="section-eyebrow" style={{ color: C.statusWarn }}><CalendarIcon size={15} /> خدمات ماشین به‌زودی</div><h2 style={{ color: C.textStrong }}>خدمات آینده هم کارت جدا دارند</h2><p style={{ color: C.text2 }}>به جای یک لیست ساده، هر خدمت آینده مشخص و قابل فهم نمایش داده می‌شود.</p></div><div className="services-grid upcoming-grid">{upcomingServices.map(service => <ServiceCard key={service.title} item={service} available={false} />)}</div></section>
      <section id="software" className="software-section" style={{ background: C.surfaceSolid, border: `1px solid ${C.borderStrong}` }}><div><div className="section-eyebrow" style={{ color: C.statusInfo }}><CloudIcon size={15} /> خدمات نرم‌افزار</div><h2 style={{ color: C.textStrong }}>ثبت ماشین و مدیریت خودرو، جدا از درخواست خدمت</h2><p style={{ color: C.text2 }}>کارهای نرم‌افزاری مثل ثبت خودرو، مدارک، یادآوری و ردیابی مسیر مشخص خودشان را دارند.</p></div><div className="software-grid">{softwareServices.map(item => <div key={item.title} style={{ background: C.fill2, border: `1px solid ${C.border}` }}><span style={{ color: C.statusInfo, background: alpha(C.statusInfo, 10) }}>{item.icon}</span><strong style={{ color: C.textStrong }}>{item.title}</strong><p style={{ color: C.muted }}>{item.text}</p></div>)}</div></section>
      <AuthCard />
      <footer className="landing-footer" style={{ color: C.muted, borderTop: `1px solid ${C.border}` }}><span>دستیار خودرو</span><span>هر خدمت کارت خودش را دارد؛ فعال، به‌زودی و نرم‌افزاری کاملاً جدا</span></footer>
      <style>{`
        .landing-page { min-height: 100vh; overflow-x: hidden; background: var(--bg-gradient); }.topbar { position: sticky; top: 0; z-index: 20; backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); }.topbar-inner { max-width: 1180px; margin: 0 auto; padding: 12px 20px; display: flex; align-items: center; justify-content: space-between; gap: 18px; }.brand, .topbar nav, .hero-actions, .trust-row, .section-eyebrow, .service-action { display: flex; align-items: center; }.brand { gap: 10px; min-width: 0; }.brand-icon { width: 42px; height: 42px; border-radius: var(--radius-lg); display: grid; place-items: center; flex: 0 0 auto; }.brand strong, .brand small { display: block; }.brand small { font-size: 11px; margin-top: 2px; }.topbar nav { gap: 8px; }.topbar nav button { border: 0; background: transparent; font: 800 12px var(--font-sans); padding: 9px 10px; cursor: pointer; }
        .hero-section { max-width: 1180px; margin: 0 auto; padding: 84px 20px 76px; display: grid; grid-template-columns: 1.02fr .98fr; gap: 48px; align-items: center; }.section-eyebrow { gap: 7px; font-size: 12px; font-weight: 950; margin-bottom: 14px; }.hero-copy h1 { font-size: clamp(36px, 5.8vw, 66px); line-height: 1.18; letter-spacing: -1.2px; margin: 0 0 18px; max-width: 760px; }.hero-copy p { font-size: 16px; line-height: 2; margin: 0; max-width: 660px; }.hero-actions { gap: 12px; margin-top: 28px; flex-wrap: wrap; }.trust-row { gap: 12px; flex-wrap: wrap; margin-top: 20px; }.trust-row span { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 750; }
        .product-map { border-radius: var(--radius-2xl); padding: 24px; }.product-map h2 { font-size: clamp(24px, 3.2vw, 36px); line-height: 1.35; margin: 0 0 22px; }.map-grid { display: grid; gap: 12px; }.map-column { border-radius: var(--radius-xl); padding: 18px; display: grid; grid-template-columns: auto 1fr; gap: 4px 12px; align-items: start; }.map-column span { width: 36px; height: 36px; border-radius: var(--radius-lg); display: grid; place-items: center; background: var(--fill-3); font-weight: 950; grid-row: span 2; }.map-column strong { font-size: 16px; }.map-column p { margin: 4px 0 0; font-size: 12.5px; line-height: 1.85; }
        .audience-section, .services-section, .soon-section { max-width: 1180px; margin: 0 auto; padding: 72px 20px; }.section-header { max-width: 760px; margin-bottom: 28px; }.section-header h2, .software-section h2, .auth-copy h2, .soon-section h2 { font-size: clamp(24px, 4vw, 40px); line-height: 1.35; margin: 0 0 10px; }.section-header p, .software-section p, .auth-copy p { font-size: 14px; line-height: 1.9; margin: 0; }.path-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }.path-card { text-align: right; border-radius: var(--radius-2xl); padding: 22px; min-height: 230px; cursor: pointer; font-family: var(--font-sans); display: flex; flex-direction: column; align-items: flex-start; transition: transform .16s ease, border-color .16s ease; }.path-card:hover, .service-card.available:hover { transform: translateY(-2px); }.path-icon, .service-visual { width: 52px; height: 52px; border-radius: var(--radius-xl); display: grid; place-items: center; }.path-title { font-size: 19px; font-weight: 950; margin-top: 18px; }.path-text { font-size: 13px; line-height: 1.85; margin-top: 8px; }.path-cta { margin-top: auto; font-size: 12.5px; font-weight: 950; }
        .services-grid { display: grid; gap: 16px; }.active-grid { grid-template-columns: 1.12fr .94fr .94fr; }.upcoming-grid { grid-template-columns: repeat(4, 1fr); }.service-card { position: relative; overflow: hidden; text-align: right; border-radius: var(--radius-2xl); padding: 22px; min-height: 252px; cursor: pointer; font-family: var(--font-sans); display: flex; flex-direction: column; align-items: flex-start; transition: transform .16s ease, border-color .16s ease; }.service-card.available:first-child { min-height: 310px; }.service-card.upcoming { cursor: default; opacity: .96; }.service-meta { position: absolute; top: 18px; left: 18px; }.service-status { border-radius: var(--radius-full); padding: 6px 10px; font-size: 11px; font-weight: 950; }.service-card strong { font-size: 21px; line-height: 1.45; margin-top: 30px; }.service-card p { margin: 9px 0 0; color: var(--text-2); font-size: 13px; line-height: 1.85; }.service-card small { margin-top: 10px; font-size: 11px; line-height: 1.7; }.service-action { gap: 6px; margin-top: auto; padding-top: 18px; font-size: 12px; font-weight: 950; }
        .software-section { max-width: 1120px; margin: 40px auto; padding: 36px; border-radius: var(--radius-2xl); display: grid; grid-template-columns: .85fr 1.15fr; gap: 26px; align-items: center; }.software-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }.software-grid div { border-radius: var(--radius-xl); padding: 16px; }.software-grid span { width: 40px; height: 40px; border-radius: var(--radius-lg); display: grid; place-items: center; margin-bottom: 14px; }.software-grid strong { display: block; font-size: 14px; margin-bottom: 7px; }.software-grid p { font-size: 12px; line-height: 1.75; }
        .auth-layout { max-width: 1080px; margin: 72px auto 96px; padding: 0 20px; display: grid; grid-template-columns: .82fr 1.18fr; gap: 28px; align-items: center; }.auth-card { padding: 24px; border-radius: var(--radius-2xl); }.auth-switch { display: grid; grid-template-columns: 1fr 1fr; border-radius: var(--radius-lg); padding: 4px; margin-bottom: 16px; }.auth-switch button { border: 0; border-radius: var(--radius-md); padding: 12px; cursor: pointer; font: 900 13px var(--font-sans); }.auth-form { display: flex; flex-direction: column; gap: 12px; margin-top: 12px; }.role-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 12px; }.role-grid button { min-height: 100px; border-radius: var(--radius-lg); font-family: var(--font-sans); cursor: pointer; padding: 10px; display: flex; flex-direction: column; align-items: flex-start; gap: 6px; text-align: right; }.role-grid strong { font-size: 12.5px; }.role-grid small { font-size: 10.5px; line-height: 1.5; }.compact-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }.otp-row { display: grid; grid-template-columns: 1fr auto; gap: 10px; align-items: center; }.otp-row button, .edit-phone { border: 0; background: transparent; cursor: pointer; font: 800 12px var(--font-sans); white-space: nowrap; }.form-error { border-radius: var(--radius-md); padding: 10px 12px; font-size: 12px; font-weight: 700; }.landing-footer { max-width: 1180px; margin: 0 auto; padding: 22px 20px 38px; display: flex; justify-content: space-between; gap: 16px; font-size: 12px; }
        @media (max-width: 980px) { .hero-section, .software-section, .auth-layout { grid-template-columns: 1fr; } .path-grid, .active-grid, .upcoming-grid, .software-grid { grid-template-columns: 1fr 1fr; } .service-card, .service-card.available:first-child { min-height: 230px; } }
        @media (max-width: 620px) { .topbar-inner { padding: 10px 14px; }.topbar nav button:nth-child(1), .topbar nav button:nth-child(2) { display: none; }.hero-section, .audience-section, .services-section, .soon-section, .auth-layout { padding-left: 14px; padding-right: 14px; }.hero-actions { display: grid; grid-template-columns: 1fr; }.hero-actions button { width: 100%; }.path-grid, .active-grid, .upcoming-grid, .software-grid, .role-grid, .compact-fields { grid-template-columns: 1fr; }.auth-card { padding: 18px; }.landing-footer { flex-direction: column; } }
      `}</style>
    </main>
  );
}
