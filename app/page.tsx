'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, Role } from '@/lib/api';
import { alpha, Button, C, Input } from '@/components/ui';
import ThemeToggle from '@/components/ThemeToggle';
import {
  BatteryIcon,
  BellIcon,
  CalendarIcon,
  CarIcon,
  CheckIcon,
  CloudIcon,
  GaugeIcon,
  LockIcon,
  SearchIcon,
  ShieldIcon,
  StoreIcon,
  WrenchIcon,
} from '@/components/icons';

function homeFor(role: Role): string {
  if (role === 'mechanic') return '/mechanic';
  if (role === 'seller') return '/seller/products';
  return '/dashboard';
}

type MainService = {
  title: string;
  label: string;
  description: string;
  time: string;
  icon: React.ReactNode;
  color: string;
};

const mainServices: MainService[] = [
  {
    title: 'تعویض باتری در محل',
    label: 'خدمت اصلی',
    description: 'ثبت درخواست سریع، هماهنگی با تکنسین نزدیک و پیگیری وضعیت تا پایان کار.',
    time: 'شروع درخواست در کمتر از ۱ دقیقه',
    icon: <BatteryIcon size={24} />,
    color: C.statusDanger,
  },
  {
    title: 'دیاگ و عیب‌یابی',
    label: 'خدمت اصلی',
    description: 'برای چراغ چک، خطاهای موتور و بررسی اولیه قبل از تعمیرگاه، ساده و قابل پیگیری.',
    time: 'مناسب مراجعه حضوری یا هماهنگی سریع',
    icon: <GaugeIcon size={24} />,
    color: C.statusInfo,
  },
  {
    title: 'سرویس و تعمیر خودرو',
    label: 'خدمت اصلی',
    description: 'ثبت سرویس‌های ضروری، انتخاب تعمیرگاه، سوابق تعمیر و هزینه‌ها در یک مسیر واضح.',
    time: 'همراه با تاریخچه کامل ماشین',
    icon: <WrenchIcon size={24} />,
    color: C.green,
  },
];

const softwareServices = [
  { title: 'مدیریت خودروها', text: 'پلاک، بیمه، معاینه فنی، مدارک و هزینه‌ها', icon: <CarIcon size={18} /> },
  { title: 'یادآوری هوشمند', text: 'قبل از سررسید سرویس، بیمه و مدارک خبر می‌گیری', icon: <BellIcon size={18} /> },
  { title: 'ردیابی و مسیرها', text: 'اتصال ردیاب و مشاهده آخرین وضعیت خودرو', icon: <CloudIcon size={18} /> },
];

const comingSoonServices = [
  'تعویض روغن', 'لاستیک و پنچرگیری', 'کارواش و دیتیلینگ', 'کولر و برق خودرو', 'صافکاری و بدنه', 'امداد جاده‌ای'
];

function scrollToLogin(mode?: 'login' | 'register') {
  if (mode) window.dispatchEvent(new CustomEvent('vehicle:set-auth-mode', { detail: mode }));
  document.getElementById('login')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function ServiceCard({ service, index }: { service: MainService; index: number }) {
  return (
    <button
      type="button"
      onClick={() => scrollToLogin('register')}
      className={`service-card service-card-${index}`}
      style={{
        '--service-color': service.color,
        background: C.surfaceSolid,
        border: `1px solid ${C.borderStrong}`,
        boxShadow: C.shadowSoft,
      } as React.CSSProperties}
    >
      <span className="service-card__badge" style={{ color: service.color, background: alpha(service.color, 12), border: `1px solid ${alpha(service.color, 28)}` }}>
        {service.label}
      </span>
      <span className="service-card__icon" style={{ color: service.color, background: alpha(service.color, 10), border: `1px solid ${alpha(service.color, 22)}` }}>
        {service.icon}
      </span>
      <span className="service-card__title" style={{ color: C.textStrong }}>{service.title}</span>
      <span className="service-card__desc" style={{ color: C.text2 }}>{service.description}</span>
      <span className="service-card__time" style={{ color: C.muted }}><CheckIcon size={14} />{service.time}</span>
    </button>
  );
}

function ProductPreview() {
  return (
    <div className="product-preview" style={{ background: C.surfaceSolid, border: `1px solid ${C.borderStrong}`, boxShadow: C.shadowHero }}>
      <div className="preview-topline">
        <span style={{ color: C.green, background: alpha(C.green, 12), border: `1px solid ${alpha(C.green, 28)}` }}>امروز</span>
        <span style={{ color: C.muted }}>همه چیز جلوی چشم</span>
      </div>
      <div className="preview-car" style={{ background: `linear-gradient(135deg, ${C.heroStart}, ${C.heroMid})`, border: `1px solid ${C.border}` }}>
        <div className="preview-car__icon" style={{ background: alpha(C.green, 14), color: C.green }}><CarIcon size={34} /></div>
        <div>
          <p style={{ color: C.textStrong }}>پژو ۲۰۷</p>
          <span style={{ color: C.muted }}>بیمه ۱۸ روز دیگر · سرویس بعدی ۷۵۰ کیلومتر</span>
        </div>
      </div>
      <div className="preview-action" style={{ background: alpha(C.statusDanger, 10), border: `1px solid ${alpha(C.statusDanger, 24)}` }}>
        <BatteryIcon size={20} style={{ color: C.statusDanger }} />
        <div>
          <p style={{ color: C.textStrong }}>باتری ضعیف گزارش شده</p>
          <span style={{ color: C.text2 }}>درخواست تعویض باتری را ثبت کن.</span>
        </div>
      </div>
      <div className="preview-grid">
        {[
          ['۳', 'خودرو'], ['۱۲', 'سرویس'], ['۰', 'هشدار باز']
        ].map(([value, label]) => (
          <div key={label} style={{ background: C.fill2, border: `1px solid ${C.border}` }}>
            <strong style={{ color: C.textStrong }}>{value}</strong>
            <span style={{ color: C.muted }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AuthCard() {
  const router = useRouter();
  const [mode, setMode]       = useState<'login' | 'register'>('login');
  const [phone, setPhone]     = useState('');
  const [code, setCode]       = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [cooldown, setCooldown]     = useState(0);
  const [name, setName]       = useState('');
  const [role, setRole]       = useState<Role>('owner');
  const [workshopName, setWorkshopName]       = useState('');
  const [workshopAddress, setWorkshopAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    const listener = (event: Event) => {
      const nextMode = (event as CustomEvent<'login' | 'register'>).detail;
      if (nextMode === 'login' || nextMode === 'register') {
        setMode(nextMode);
        editPhone();
      }
    };
    window.addEventListener('vehicle:set-auth-mode', listener);
    return () => window.removeEventListener('vehicle:set-auth-mode', listener);
  }, []);

  useEffect(() => {
    if (!localStorage.getItem('vtoken')) return;
    try {
      const u = JSON.parse(localStorage.getItem('vuser') || '{}');
      router.replace(homeFor(u.role));
    } catch {
      router.replace('/dashboard');
    }
  }, [router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  function editPhone() {
    setOtpSent(false);
    setCode('');
    setError('');
  }

  async function sendOtp() {
    setError('');
    setOtpLoading(true);
    try {
      await api.auth.requestOtp(phone);
      setOtpSent(true);
      setCooldown(60);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setOtpLoading(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!otpSent) return sendOtp();
    setLoading(true);
    setError('');
    try {
      const res = mode === 'login'
        ? await api.auth.login(phone, code)
        : await api.auth.register({ phone, code, name, role, workshopName, workshopAddress });
      localStorage.setItem('vtoken', res.access_token);
      localStorage.setItem('vuser', JSON.stringify(res.user));
      router.push(homeFor(res.user.role));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="login" className="auth-card" style={{ background: C.surfaceSolid, border: `1px solid ${C.borderStrong}`, boxShadow: C.shadowCard }}>
      <div className="section-eyebrow" style={{ color: C.green }}><LockIcon size={15} /> ورود ساده با پیامک</div>
      <h2 style={{ color: C.textStrong }}>فقط شماره موبایل را وارد کن</h2>
      <p style={{ color: C.text2 }}>کد تأیید می‌گیری و مستقیم وارد برنامه می‌شی. بعداً می‌تونی خودرو، سرویس‌ها و یادآورها را کامل کنی.</p>

      <div className="auth-switch" style={{ background: C.fill1, border: `1px solid ${C.border}` }}>
        {(['login', 'register'] as const).map(m => (
          <button
            key={m}
            type="button"
            onClick={() => { setMode(m); editPhone(); }}
            style={{
              background: mode === m ? C.textStrong : 'transparent',
              color: mode === m ? C.bg : C.muted,
            }}
          >
            {m === 'login' ? 'ورود' : 'شروع ثبت‌نام'}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="auth-form">
        {mode === 'register' && (
          <div className="register-panel" style={{ background: C.fill1, border: `1px solid ${C.border}` }}>
            <label style={{ color: C.muted }}>من می‌خواهم به عنوان</label>
            <div className="role-grid">
              {([
                { v: 'owner' as const,    label: 'مالک خودرو', text: 'درخواست خدمات و مدیریت ماشین', icon: <CarIcon size={17} /> },
                { v: 'mechanic' as const, label: 'تعمیرگاه', text: 'دریافت درخواست و ثبت سرویس', icon: <WrenchIcon size={17} /> },
                { v: 'seller' as const,   label: 'فروشگاه', text: 'فروش قطعه و حسابداری', icon: <StoreIcon size={17} /> },
              ]).map(opt => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setRole(opt.v)}
                  style={{
                    background: role === opt.v ? alpha(C.green, 13) : C.fill2,
                    border: `1px solid ${role === opt.v ? alpha(C.green, 45) : C.border}`,
                    color: role === opt.v ? C.textStrong : C.text2,
                  }}
                >
                  <span style={{ color: role === opt.v ? C.green : C.muted }}>{opt.icon}</span>
                  <strong>{opt.label}</strong>
                  <small style={{ color: C.muted }}>{opt.text}</small>
                </button>
              ))}
            </div>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="نام و نام خانوادگی" required />
            {(role === 'mechanic' || role === 'seller') && (
              <div className="compact-fields">
                <Input value={workshopName} onChange={e => setWorkshopName(e.target.value)} placeholder={role === 'mechanic' ? 'نام تعمیرگاه' : 'نام فروشگاه'} required />
                <Input value={workshopAddress} onChange={e => setWorkshopAddress(e.target.value)} placeholder="آدرس یا محدوده فعالیت" />
              </div>
            )}
          </div>
        )}

        <Input
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder="شماره موبایل: 09123456789"
          type="tel"
          required
          readOnly={otpSent}
          dir="ltr"
          style={{ textAlign: 'left', opacity: otpSent ? 0.7 : 1 }}
        />

        {otpSent && (
          <div className="otp-row">
            <Input
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="کد ۴ رقمی"
              inputMode="numeric"
              autoFocus
              required
              dir="ltr"
              style={{ textAlign: 'center', letterSpacing: 4, fontSize: 18 }}
            />
            <button type="button" onClick={sendOtp} disabled={cooldown > 0 || otpLoading} style={{ color: cooldown > 0 ? C.muted : C.green }}>
              {cooldown > 0 ? `${cooldown} ثانیه` : 'ارسال مجدد'}
            </button>
          </div>
        )}

        {otpSent && (
          <button type="button" onClick={editPhone} className="edit-phone" style={{ color: C.green }}>
            ویرایش شماره موبایل
          </button>
        )}

        {error && <div className="form-error" style={{ color: C.statusExpired, background: alpha(C.statusExpired, 10), border: `1px solid ${alpha(C.statusExpired, 22)}` }}>{error}</div>}

        <Button type="submit" loading={otpSent ? loading : otpLoading} fullWidth size="lg">
          {!otpSent ? 'دریافت کد و ادامه' : (mode === 'login' ? 'ورود به برنامه' : 'ساخت حساب و ورود')}
        </Button>
      </form>
    </section>
  );
}

export default function LandingPage() {
  return (
    <main className="landing-page">
      <header className="topbar" style={{ background: C.navBg, borderBottom: `1px solid ${C.border}` }}>
        <div className="topbar-inner">
          <div className="brand">
            <span className="brand-icon" style={{ color: C.green, background: alpha(C.green, 12), border: `1px solid ${alpha(C.green, 30)}` }}><CarIcon size={22} /></span>
            <div>
              <strong style={{ color: C.textStrong }}>دستیار خودرو</strong>
              <small style={{ color: C.muted }}>خدمات ماشین و مدیریت خودرو</small>
            </div>
          </div>
          <nav>
            <button type="button" onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })} style={{ color: C.text2 }}>خدمات</button>
            <button type="button" onClick={() => scrollToLogin('login')} style={{ color: C.text2 }}>ورود</button>
            <ThemeToggle size={38} />
          </nav>
        </div>
      </header>

      <section className="hero-section">
        <div className="hero-copy">
          <div className="section-eyebrow" style={{ color: C.green }}><ShieldIcon size={15} /> پلتفرم کامل خدمات ماشین</div>
          <h1 style={{ color: C.textStrong }}>خدمت مورد نیاز ماشینت را همان نگاه اول پیدا کن</h1>
          <p style={{ color: C.text2 }}>
            تعویض باتری، دیاگ، سرویس و پیگیری کامل خودرو در یک برنامه ساده. بدون صفحه‌های گنگ؛ فقط انتخاب خدمت، ثبت درخواست و پیگیری.
          </p>
          <div className="hero-actions">
            <Button size="lg" onClick={() => scrollToLogin('register')} icon={<CheckIcon size={17} />}>شروع سریع</Button>
            <Button size="lg" variant="secondary" onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })} icon={<SearchIcon size={17} />}>دیدن خدمات</Button>
          </div>
          <div className="trust-row">
            {['ورود با پیامک', 'مناسب مالک خودرو', 'آماده توسعه خدمات جدید'].map(item => (
              <span key={item} style={{ color: C.muted }}><CheckIcon size={13} style={{ color: C.green }} />{item}</span>
            ))}
          </div>
        </div>
        <ProductPreview />
      </section>

      <section id="services" className="services-section">
        <div className="section-header">
          <div className="section-eyebrow" style={{ color: C.green }}><WrenchIcon size={15} /> خدمات اصلی کاربران</div>
          <h2 style={{ color: C.textStrong }}>سه مسیر واضح برای شروع</h2>
          <p style={{ color: C.text2 }}>به جای نمایش پراکنده امکانات، کاربر از همین صفحه می‌فهمد چه کاری می‌تواند انجام دهد.</p>
        </div>
        <div className="services-grid">
          {mainServices.map((service, index) => <ServiceCard key={service.title} service={service} index={index} />)}
        </div>
      </section>

      <section className="software-section" style={{ background: C.surfaceSolid, border: `1px solid ${C.borderStrong}` }}>
        <div>
          <div className="section-eyebrow" style={{ color: C.green }}><CloudIcon size={15} /> خدمات نرم‌افزاری داخل برنامه</div>
          <h2 style={{ color: C.textStrong }}>بعد از ثبت‌نام، همه چیز برای مدیریت ماشین آماده است</h2>
        </div>
        <div className="software-grid">
          {softwareServices.map(item => (
            <div key={item.title} style={{ background: C.fill2, border: `1px solid ${C.border}` }}>
              <span style={{ color: C.green, background: alpha(C.green, 10) }}>{item.icon}</span>
              <strong style={{ color: C.textStrong }}>{item.title}</strong>
              <p style={{ color: C.muted }}>{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="soon-section">
        <div className="section-header compact">
          <div className="section-eyebrow" style={{ color: C.statusWarn }}><CalendarIcon size={15} /> در حال آماده‌سازی</div>
          <h2 style={{ color: C.textStrong }}>خدمات بعدی خودرو</h2>
          <p style={{ color: C.text2 }}>این بخش از همین حالا جای توسعه آینده را نشان می‌دهد، بدون اینکه کاربر را در شروع گیج کند.</p>
        </div>
        <div className="soon-list">
          {comingSoonServices.map(item => <span key={item} style={{ color: C.text2, background: C.fill2, border: `1px solid ${C.border}` }}>{item}</span>)}
        </div>
      </section>

      <AuthCard />

      <footer className="landing-footer" style={{ color: C.muted, borderTop: `1px solid ${C.border}` }}>
        <span>دستیار خودرو</span>
        <span>خدمات ماشین، سوابق سرویس، یادآوری و ردیابی در یک برنامه ساده</span>
      </footer>

      <style>{`
        .landing-page { min-height: 100vh; overflow-x: hidden; background: var(--bg-gradient); }
        .topbar { position: sticky; top: 0; z-index: 20; backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); }
        .topbar-inner { max-width: 1120px; margin: 0 auto; padding: 12px 20px; display: flex; align-items: center; justify-content: space-between; gap: 18px; }
        .brand, .topbar nav, .hero-actions, .trust-row, .section-eyebrow, .preview-topline, .preview-car, .preview-action, .service-card__time { display: flex; align-items: center; }
        .brand { gap: 10px; min-width: 0; }
        .brand-icon { width: 42px; height: 42px; border-radius: var(--radius-lg); display: grid; place-items: center; flex: 0 0 auto; }
        .brand strong, .brand small { display: block; }
        .brand small { font-size: 11px; margin-top: 2px; }
        .topbar nav { gap: 8px; }
        .topbar nav button { border: 0; background: transparent; font: 700 12px var(--font-sans); padding: 9px 10px; cursor: pointer; }
        .hero-section { max-width: 1120px; margin: 0 auto; padding: 76px 20px 64px; display: grid; grid-template-columns: 1.08fr 0.92fr; gap: 42px; align-items: center; }
        .section-eyebrow { gap: 7px; font-size: 12px; font-weight: 900; margin-bottom: 14px; }
        .hero-copy h1 { font-size: clamp(34px, 6vw, 68px); line-height: 1.18; letter-spacing: -1.5px; margin: 0 0 18px; max-width: 720px; }
        .hero-copy p { font-size: 16px; line-height: 2; margin: 0; max-width: 620px; }
        .hero-actions { gap: 12px; margin-top: 28px; flex-wrap: wrap; }
        .trust-row { gap: 12px; flex-wrap: wrap; margin-top: 20px; }
        .trust-row span { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 700; }
        .product-preview { border-radius: var(--radius-2xl); padding: 20px; position: relative; overflow: hidden; }
        .preview-topline { justify-content: space-between; margin-bottom: 16px; font-size: 12px; font-weight: 800; }
        .preview-topline span:first-child { border-radius: var(--radius-full); padding: 6px 12px; }
        .preview-car { gap: 12px; border-radius: var(--radius-xl); padding: 18px; min-height: 112px; }
        .preview-car__icon { width: 70px; height: 70px; border-radius: var(--radius-xl); display: grid; place-items: center; flex: 0 0 auto; }
        .preview-car p, .preview-action p { margin: 0 0 6px; font-size: 16px; font-weight: 900; }
        .preview-car span, .preview-action span { font-size: 12px; line-height: 1.8; }
        .preview-action { gap: 12px; border-radius: var(--radius-lg); padding: 15px; margin-top: 12px; }
        .preview-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 12px; }
        .preview-grid div { border-radius: var(--radius-lg); padding: 14px 10px; text-align: center; }
        .preview-grid strong, .preview-grid span { display: block; }
        .preview-grid strong { font-size: 20px; }
        .preview-grid span { font-size: 11px; margin-top: 4px; }
        .services-section, .soon-section { max-width: 1120px; margin: 0 auto; padding: 64px 20px; }
        .section-header { max-width: 680px; margin-bottom: 26px; }
        .section-header.compact { margin-bottom: 20px; }
        .section-header h2, .software-section h2, .auth-card h2, .soon-section h2 { font-size: clamp(24px, 4vw, 38px); line-height: 1.35; margin: 0 0 10px; }
        .section-header p, .auth-card p { font-size: 14px; line-height: 1.9; margin: 0; }
        .services-grid { display: grid; grid-template-columns: 1.2fr 0.9fr 0.9fr; gap: 16px; }
        .service-card { min-height: 270px; text-align: right; border-radius: var(--radius-2xl); padding: 22px; cursor: pointer; font-family: var(--font-sans); display: flex; flex-direction: column; align-items: flex-start; transition: transform .18s ease, border-color .18s ease, background .18s ease; }
        .service-card:hover { transform: translateY(-2px); border-color: color-mix(in srgb, var(--service-color) 40%, var(--border-strong)); }
        .service-card-0 { min-height: 320px; }
        .service-card__badge { border-radius: var(--radius-full); padding: 6px 10px; font-size: 11px; font-weight: 900; margin-bottom: auto; }
        .service-card__icon { width: 54px; height: 54px; border-radius: var(--radius-xl); display: grid; place-items: center; margin-top: 30px; }
        .service-card__title { display: block; font-size: 21px; font-weight: 950; line-height: 1.45; margin-top: 14px; }
        .service-card__desc { display: block; font-size: 13px; line-height: 1.9; margin-top: 8px; }
        .service-card__time { gap: 6px; font-size: 11.5px; font-weight: 800; margin-top: 16px; }
        .software-section { max-width: 1080px; margin: 36px auto; padding: 34px; border-radius: var(--radius-2xl); display: grid; grid-template-columns: .9fr 1.1fr; gap: 26px; align-items: center; }
        .software-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .software-grid div { border-radius: var(--radius-xl); padding: 16px; }
        .software-grid span { width: 38px; height: 38px; border-radius: var(--radius-lg); display: grid; place-items: center; margin-bottom: 14px; }
        .software-grid strong { display: block; font-size: 14px; margin-bottom: 7px; }
        .software-grid p { margin: 0; font-size: 12px; line-height: 1.75; }
        .soon-list { display: flex; flex-wrap: wrap; gap: 10px; }
        .soon-list span { border-radius: var(--radius-full); padding: 10px 14px; font-size: 12px; font-weight: 800; }
        .auth-card { max-width: 560px; margin: 58px auto 80px; padding: 28px; border-radius: var(--radius-2xl); }
        .auth-card h2 { margin-bottom: 8px; }
        .auth-switch { display: grid; grid-template-columns: 1fr 1fr; border-radius: var(--radius-lg); padding: 4px; margin: 22px 0 16px; }
        .auth-switch button { border: 0; border-radius: var(--radius-md); padding: 12px; cursor: pointer; font: 900 13px var(--font-sans); transition: background .16s ease, color .16s ease; }
        .auth-form { display: flex; flex-direction: column; gap: 12px; }
        .register-panel { border-radius: var(--radius-xl); padding: 14px; display: flex; flex-direction: column; gap: 12px; }
        .register-panel > label { font-size: 12px; font-weight: 800; }
        .role-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        .role-grid button { min-height: 104px; border-radius: var(--radius-lg); font-family: var(--font-sans); cursor: pointer; padding: 10px; display: flex; flex-direction: column; align-items: flex-start; gap: 6px; text-align: right; }
        .role-grid strong { font-size: 12.5px; }
        .role-grid small { font-size: 10.5px; line-height: 1.5; }
        .compact-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .otp-row { display: grid; grid-template-columns: 1fr auto; gap: 10px; align-items: center; }
        .otp-row button, .edit-phone { border: 0; background: transparent; cursor: pointer; font: 800 12px var(--font-sans); white-space: nowrap; }
        .form-error { border-radius: var(--radius-md); padding: 10px 12px; font-size: 12px; font-weight: 700; }
        .landing-footer { max-width: 1120px; margin: 0 auto; padding: 22px 20px 38px; display: flex; justify-content: space-between; gap: 16px; font-size: 12px; }
        @media (max-width: 900px) {
          .hero-section { grid-template-columns: 1fr; padding-top: 46px; }
          .services-grid, .software-section { grid-template-columns: 1fr; }
          .software-grid { grid-template-columns: 1fr; }
          .service-card, .service-card-0 { min-height: 230px; }
        }
        @media (max-width: 560px) {
          .topbar-inner { padding: 10px 14px; }
          .topbar nav button:first-child { display: none; }
          .hero-section, .services-section, .soon-section { padding-left: 14px; padding-right: 14px; }
          .hero-actions { display: grid; grid-template-columns: 1fr; }
          .hero-actions button { width: 100%; }
          .preview-grid, .role-grid, .compact-fields { grid-template-columns: 1fr; }
          .auth-card { margin: 36px 14px 54px; padding: 20px; }
          .landing-footer { flex-direction: column; }
        }
      `}</style>
    </main>
  );
}
