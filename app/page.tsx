'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, PresetService, Role } from '@/lib/api';
import Link from 'next/link';
import { alpha, Button, C } from '@/components/ui';
import ServiceCard from '@/components/ServiceCard';
import ThemeToggle from '@/components/ThemeToggle';
import { fa } from '@/components/ScreenKit';
import {
  CarIcon, CheckIcon, ChevronLeftIcon, ClockIcon, LockIcon, SearchIcon,
  ShieldIcon, StoreIcon, WrenchIcon, StarIcon, CalendarIcon, WalletIcon,
} from '@/components/icons';

/**
 * The landing page.
 *
 * It used to open with a wall of service cards, two thirds of them labelled
 * «به‌زودی» and unclickable — a visitor's first impression was a grid of things
 * the product could not do, drawn at the same size as the things it could. Only
 * the services that genuinely run get a card now; the rest are a compact list
 * beneath, which keeps the promise visible without letting it crowd out the
 * offer. The catalogue endpoint needs no token, so all of it is browsable and
 * searchable before signing up — search is the call to action, and the account
 * comes after the visitor has found what they came for.
 */

function homeFor(role: Role): string {
  if (role === 'mechanic') return '/mechanic';
  if (role === 'seller') return '/seller';
  return '/dashboard';
}

const STEPS = [
  { icon: <SearchIcon size={19} />, t: 'خدمت را انتخاب کن', d: 'از فهرست خدمات، آنچه ماشینت لازم دارد را بردار.' },
  { icon: <StoreIcon size={19} />, t: 'تعمیرگاه را ببین', d: 'امتیاز، فاصله و قیمت تقریبی را مقایسه کن.' },
  { icon: <CalendarIcon size={19} />, t: 'نوبت بگیر', d: 'روز و ساعت را بگذار؛ در تعمیرگاه یا در محل خودت.' },
];

export default function LandingPage() {
  const router = useRouter();
  const [services, setServices] = useState<PresetService[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');

  useEffect(() => {
    api.catalog.publicServices()
      .then((r) => { setServices(r.items); setCategories(r.categories); })
      .catch(() => {});
  }, []);

  const shown = useMemo(() => {
    const needle = q.trim();
    return services.filter((s) => {
      if (cat && s.category !== cat) return false;
      if (!needle) return true;
      return `${s.customName ?? ''} ${s.serviceType} ${s.category}`.includes(needle);
    });
  }, [services, q, cat]);

  // آنچه واقعاً ارائه می‌شود، کارت می‌گیرد؛ «به‌زودی»ها فقط یک فهرست فشرده‌اند.
  const live = useMemo(() => shown.filter((s) => s.availableNow !== false), [shown]);
  const soon = useMemo(() => shown.filter((s) => s.availableNow === false), [shown]);
  const liveCount = services.filter((s) => s.availableNow !== false).length;


  /* Sign-up used to be a card at the bottom of this page, reached by a scroll
     and a custom event. It has its own screen now, so this is a plain link. */
  const goAuth = (role?: Role) =>
    router.push(`/login?mode=register${role ? `&role=${role}` : ''}`);

  return (
    <main className="lp">
      <header className="lp-bar">
        <div className="lp-brand">
          <span style={{ color: C.green, background: alpha(C.green, 12) }}><CarIcon size={20} /></span>
          <b style={{ color: C.textStrong }}>دستیار خودرو</b>
        </div>
        <nav>
          <Link href="/login" className="lp-signin" style={{ color: C.text2 }}>ورود</Link>
          <Link href="/login?mode=register" className="lp-signup"
            style={{ background: `linear-gradient(135deg, ${C.green}, ${C.greenDark})`, color: C.onAccent, boxShadow: C.shadowBrand }}>
            ثبت‌نام
          </Link>
          <ThemeToggle size={38} />
        </nav>
      </header>

      {/* ── hero: the search is the call to action ── */}
      <section className="lp-hero">
        <p className="lp-eyebrow" style={{ color: C.green }}>خدمات خودرو، بدون تماس و چانه‌زنی</p>
        <h1 style={{ color: C.textStrong }}>ماشینت چه لازم دارد؟</h1>
        <p className="lp-sub" style={{ color: C.text2 }}>
          خدمت را انتخاب کن، تعمیرگاه‌های نزدیک را با امتیاز و قیمت تقریبی ببین، و نوبت بگیر.
        </p>

        <div className="lp-search" style={{ background: C.surfaceSolid, boxShadow: C.shadowHero }}>
          <SearchIcon size={19} color={C.muted} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="مثلاً تعویض روغن، ترمز، باتری..."
            aria-label="جستجوی خدمت"
            style={{ color: C.textStrong }}
          />
          <Button size="sm" onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })}>جستجو</Button>
        </div>

        {services.length > 0 && (
          <p className="lp-count" style={{ color: C.muted }}>
            {fa(liveCount)} خدمت فعال{services.length > liveCount ? ` · ${fa(services.length - liveCount)} خدمت به‌زودی` : ''} · بدون ثبت‌نام ببین
          </p>
        )}
      </section>

      {/* ── the real catalogue, browsable before signing up ── */}
      <section id="services" className="lp-services">
        <div className="lp-head">
          <h2 style={{ color: C.textStrong }}>خدمات موجود</h2>
          <div className="lp-cats">
            {['', ...categories].map((c) => {
              const on = cat === c;
              return (
                <button
                  key={c || 'all'}
                  type="button"
                  onClick={() => setCat(c)}
                  style={{
                    background: on ? `linear-gradient(140deg, ${C.green}, ${C.greenDark})` : C.surfaceSolid,
                    color: on ? C.onAccent : C.text2,
                    boxShadow: on ? C.shadowBrand : C.shadowSoft,
                  }}
                >{c || 'همه'}</button>
              );
            })}
          </div>
        </div>

        {shown.length === 0 ? (
          <p className="lp-empty" style={{ color: C.muted }}>
            {services.length ? 'خدمتی با این جستجو پیدا نشد.' : 'در حال بارگذاری فهرست خدمات...'}
          </p>
        ) : (
          <>
            {live.length > 0 && (
              <div className="svc-grid">
                {live.map((s, i) => (
                  <ServiceCard key={s.key} s={s} index={i} onClick={() => goAuth('owner')} />
                ))}
              </div>
            )}

            {soon.length > 0 && (
              <div className="soon-block">
                <p className="soon-title" style={{ color: C.text2 }}>
                  <ClockIcon size={14} />
                  به‌زودی اضافه می‌شود
                  <span style={{ color: C.muted }}>{fa(soon.length)} خدمت</span>
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
      </section>

      {/* ── how it works ── */}
      <section className="lp-steps">
        <h2 style={{ color: C.textStrong }}>چطور کار می‌کند</h2>
        <ol>
          {STEPS.map((s, i) => (
            <li key={s.t} style={{ background: C.surfaceSolid, boxShadow: C.shadowSoft }}>
              <span style={{ background: alpha(C.green, 12), color: C.green }}>{s.icon}</span>
              <b style={{ color: C.textStrong }}>{s.t}</b>
              <p style={{ color: C.text2 }}>{s.d}</p>
              <i style={{ color: C.subtle }}>{fa(i + 1)}</i>
            </li>
          ))}
        </ol>
      </section>

      {/* ── what keeps it honest ── */}
      <section className="lp-trust">
        {[
          { icon: <StarIcon size={17} />, t: 'امتیاز واقعی مشتری‌ها', d: 'هر تعمیرگاه امتیاز و تعداد نظرش را کنار اسمش دارد.' },
          { icon: <WalletIcon size={17} />, t: 'قیمت پیش از مراجعه', d: 'برآورد هزینه را قبل از ثبت درخواست می‌بینی؛ فاکتور نهایی را تعمیرگاه تایید می‌کند.' },
          { icon: <ShieldIcon size={17} />, t: 'سوابق ماشینت یکجا', d: 'سرویس‌ها، مدارک و یادآوری بیمه و معاینه در یک پرونده می‌ماند.' },
        ].map((x) => (
          <div key={x.t} style={{ background: C.surfaceSolid, boxShadow: C.shadowSoft }}>
            <span style={{ background: alpha(C.green, 11), color: C.green }}>{x.icon}</span>
            <b style={{ color: C.textStrong }}>{x.t}</b>
            <p style={{ color: C.muted }}>{x.d}</p>
          </div>
        ))}
      </section>

      {/* ── the other side of the marketplace ── */}
      <section className="lp-pro">
        <div className="lp-pro-copy">
          <h2>تعمیرگاه یا فروشگاه داری؟</h2>
          <p>مشتری‌های نزدیکت پیدایت می‌کنند. نوبت، مشتری، انبار و حساب‌وکتاب هم همین‌جا جمع می‌شود.</p>
        </div>
        <div className="lp-pro-actions">
          <Button size="lg" onClick={() => router.push('/join/mechanic')} icon={<WrenchIcon size={16} />}>ثبت تعمیرگاه</Button>
          <Button size="lg" variant="secondary" onClick={() => goAuth('seller')} icon={<StoreIcon size={16} />}>ثبت فروشگاه</Button>
        </div>
      </section>

      {/* ── the invitation; the form itself is a screen of its own now ── */}
      <section className="lp-cta" style={{ background: C.surfaceSolid, boxShadow: C.shadowHero }}>
        <span className="lp-cta-ico" style={{ background: alpha(C.green, 12), color: C.green }}><LockIcon size={22} /></span>
        <div className="lp-cta-copy">
          <h2 style={{ color: C.textStrong }}>با شماره موبایل وارد شو</h2>
          <p style={{ color: C.text2 }}>
            رمزی در کار نیست — یک کد چهار رقمی می‌فرستیم و تمام. حساب روی همین گوشی می‌ماند، پس لازم نیست هر بار دوباره وارد شوی.
          </p>
        </div>
        <div className="lp-cta-actions">
          <Button size="lg" onClick={() => router.push('/login?mode=register')}>ساخت حساب</Button>
          <Button size="lg" variant="secondary" onClick={() => router.push('/login')}>ورود</Button>
        </div>
      </section>

      <footer className="lp-foot" style={{ color: C.muted }}>
        <span>دستیار خودرو</span>
        <span>خدمات، سوابق و مدارک خودرو در یک برنامه</span>
      </footer>

      <style>{LP_CSS}</style>
    </main>
  );
}

const LP_CSS = `
.lp-signin{font-size:13px;font-weight:800;text-decoration:none;padding:9px 6px;
           min-height:44px;display:inline-flex;align-items:center;padding-inline:12px}
.lp-signup{font-size:13px;font-weight:900;text-decoration:none;border-radius:13px;padding:10px 16px;
           min-height:44px;display:inline-flex;align-items:center;
           transition:transform var(--dur-press,120ms) var(--ease-soft,ease)}
.lp-signup:active{transform:scale(.96)}
.lp-cta{margin-top:var(--sp-6);border-radius:var(--r-sheet);padding:var(--sp-5) var(--sp-4);
        display:grid;gap:var(--sp-3);justify-items:center;text-align:center}
.lp-cta-ico{width:54px;height:54px;border-radius:18px;display:grid;place-items:center}
.lp-cta-copy h2{margin:0;font-size:20px;font-weight:950;letter-spacing:-.3px;text-wrap:balance}
.lp-cta-copy p{margin:var(--sp-2) 0 0;font-size:13px;line-height:2;max-width:46ch}
.lp-cta-actions{display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-2);width:100%;max-width:340px}
@media (prefers-reduced-motion: reduce){ .lp-signup:active{transform:none} }

.lp{min-height:100vh;background:var(--bg-gradient);overflow-x:hidden}
.lp section{max-width:960px;margin:0 auto;padding-inline:var(--sp-4)}
.lp-bar{position:sticky;top:0;z-index:20;display:flex;align-items:center;justify-content:space-between;gap:var(--sp-4);padding:var(--sp-3) var(--sp-4);max-width:960px;margin:0 auto;backdrop-filter:blur(18px)}
.lp-brand{display:flex;align-items:center;gap:var(--sp-2)}
.lp-brand>span{width:40px;height:40px;border-radius:var(--r-plate);display:grid;place-items:center}
.lp-brand b{font-size:15px;font-weight:950}
.lp-bar nav{display:flex;align-items:center;gap:var(--sp-2)}
.lp-bar nav button{border:0;background:transparent;font:900 13px var(--font-sans);cursor:pointer;padding:11px 14px;border-radius:var(--r-plate)}
.lp-hero{padding-top:var(--sp-6);padding-bottom:var(--sp-5);text-align:center}
.lp-eyebrow{display:inline-flex;align-items:center;gap:6px;margin:0 0 var(--sp-3);font-size:12px;font-weight:950}
.lp-hero h1{margin:0;font-size:clamp(28px,7vw,52px);font-weight:950;line-height:1.2;letter-spacing:-1px;text-wrap:balance}
.lp-sub{margin:var(--sp-3) auto 0;font-size:14.5px;line-height:1.9;max-width:44ch}
.lp-search{display:flex;align-items:center;gap:var(--sp-2);border-radius:var(--r-card);padding:var(--sp-2) var(--sp-2) var(--sp-2) var(--sp-3);margin:var(--sp-5) auto 0;max-width:520px}
.lp-search input{flex:1;min-width:0;border:0;outline:0;background:transparent;font:700 14px var(--font-sans);padding:12px 0}
.lp-count{margin:var(--sp-3) 0 0;font-size:12px;font-weight:800}
.lp-services{padding-top:var(--sp-5)}
.lp-head{display:flex;flex-direction:column;gap:var(--sp-3);margin-bottom:var(--sp-4)}
.lp-head h2,.lp-steps h2{margin:0;font-size:19px;font-weight:950}
.lp-cats{display:flex;gap:var(--sp-2);overflow-x:auto;scrollbar-width:none;padding-bottom:4px}
.lp-cats::-webkit-scrollbar{display:none}
.lp-cats button{flex:0 0 auto;border:0;border-radius:999px;padding:11px 16px;font:900 12.5px var(--font-sans);cursor:pointer;transition:transform .16s ease}
.lp-cats button:active{transform:scale(.97)}
.lp-empty{text-align:center;padding:var(--sp-6) 0;font-size:13px}
.lp-steps{padding-top:var(--sp-6)}
.lp-steps ol{list-style:none;margin:var(--sp-4) 0 0;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:var(--sp-3)}
.lp-steps li{position:relative;border-radius:var(--r-card);padding:var(--sp-4);overflow:hidden}
.lp-steps li>span{width:44px;height:44px;border-radius:var(--r-plate);display:grid;place-items:center;margin-bottom:var(--sp-3)}
.lp-steps b{display:block;font-size:14.5px;font-weight:900}
.lp-steps p{margin:6px 0 0;font-size:12.5px;line-height:1.8}
.lp-steps i{position:absolute;top:var(--sp-4);inset-inline-end:var(--sp-4);font-style:normal;font-size:13px;font-weight:900;color:var(--green);font-variant-numeric:tabular-nums}
.lp-trust{padding-top:var(--sp-6);display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:var(--sp-3)}
.lp-trust>div{border-radius:var(--r-card);padding:var(--sp-4);display:grid;gap:var(--sp-2)}
.lp-trust span{width:40px;height:40px;border-radius:var(--r-plate);display:grid;place-items:center}
.lp-trust b{font-size:14px;font-weight:900}
.lp-trust p{margin:0;font-size:12.5px;line-height:1.8}
.lp-pro{position:relative;overflow:hidden;margin-top:var(--sp-6)!important;border-radius:var(--r-sheet);padding:var(--sp-5)!important;background:var(--surface-solid);border:1px solid var(--border);box-shadow:var(--shadow-soft);display:grid;gap:var(--sp-4)}
/* one rule keys the panel; flooding it with the accent made the accent mean nothing */
.lp-pro::before{content:'';position:absolute;inset-block:0;inset-inline-start:0;width:3px;background:var(--green)}
.lp-pro-copy h2{margin:0;font-size:21px;font-weight:950;color:var(--text-strong)}
.lp-pro-copy p{margin:var(--sp-2) 0 0;font-size:13px;line-height:1.85;color:var(--text-2)}
.lp-pro-actions{display:flex;gap:var(--sp-2);flex-wrap:wrap}
.lp-pro-actions button{flex:1 1 160px}
.lp-foot{max-width:960px;margin:var(--sp-7) auto 0;padding:var(--sp-4);display:flex;flex-wrap:wrap;justify-content:space-between;gap:var(--sp-2);font-size:11.5px}
@media(min-width:760px){
  .lp-head{flex-direction:row;align-items:center;justify-content:space-between}
  .lp-pro{grid-template-columns:1.4fr 1fr;align-items:center}
}
`;
