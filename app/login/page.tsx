'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, type Role } from '@/lib/api';
import { C, alpha, Button, Input } from '@/components/ui';
import OtpInput from '@/components/OtpInput';
import WorkingHoursEditor from '@/components/WorkingHoursEditor';
import { type WorkingHours } from '@/lib/workingHours';
import { fa } from '@/components/ScreenKit';
import {
  CarIcon, ChevronRightIcon, LockIcon, StoreIcon, WrenchIcon, ShieldIcon, CheckIcon,
} from '@/components/icons';

/**
 * Sign in and sign up, on their own screen.
 *
 * This used to be a card at the foot of the landing page: you scrolled past
 * the whole marketing pitch to reach it, and the sign-up form showed a name, a
 * shop name, an address and a phone number all at once before asking for
 * anything. Here each step asks for one thing, so the form never looks long —
 * and with a code-based login there is no password to invent or recover.
 */

type Step = 'role' | 'profile' | 'code';

function homeFor(role: Role): string {
  if (role === 'mechanic') return '/mechanic';
  if (role === 'seller') return '/seller';
  return '/dashboard';
}

const ROLES: Array<{ v: Role; label: string; sub: string; icon: React.ReactNode }> = [
  { v: 'owner',    label: 'مالک خودرو', sub: 'سرویس بگیر، مدارک و هزینه‌ها را یک‌جا داشته باش', icon: <CarIcon size={20} /> },
  { v: 'mechanic', label: 'تعمیرگاه',   sub: 'مشتری بگیر، نوبت و حساب‌وکتاب را مدیریت کن',     icon: <WrenchIcon size={20} /> },
  { v: 'seller',   label: 'فروشنده',    sub: 'قطعات و محصولاتت را به مشتری‌ها برسان',          icon: <StoreIcon size={20} /> },
];

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [step, setStep] = useState<Step>('profile');
  const [role, setRole] = useState<Role>('owner');

  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [workshopName, setWorkshopName] = useState('');
  const [workshopAddress, setWorkshopAddress] = useState('');
  /** ساعت کاری فروشگاه، همان موقع ثبت‌نام؛ اختیاری */
  const [workingHours, setWorkingHours] = useState<WorkingHours | null>(null);

  const [cooldown, setCooldown] = useState(0);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [nextTarget, setNextTarget] = useState('');

  /* Already signed in? Never show this screen — go where they were going. */
  useEffect(() => {
    try {
      if (!localStorage.getItem('vtoken')) return;
      const u = JSON.parse(localStorage.getItem('vuser') || '{}');
      router.replace(homeFor(u.role));
    } catch { /* nothing stored yet */ }
  }, [router]);

  /* `?mode=register` from the landing page's buttons. Read from the URL rather
     than useSearchParams so the page needs no Suspense boundary. */
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get('mode') === 'register') { setMode('register'); setStep('role'); }
    const r = q.get('role');
    if (r === 'owner' || r === 'mechanic' || r === 'seller') setRole(r);
    /* Where the person was heading before being asked to sign in. Only
       same-site paths are honoured — an absolute URL here would be an open
       redirect straight out of our own login screen. */
    const n = q.get('next');
    if (n && n.startsWith('/') && !n.startsWith('//')) setNextTarget(n);
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  function switchMode(next: 'login' | 'register') {
    setMode(next);
    setStep(next === 'register' ? 'role' : 'profile');
    setCode(''); setError('');
  }

  async function sendOtp() {
    if (!/^09\d{9}$/.test(phone)) { setError('شماره موبایل باید با ۰۹ شروع شود و ۱۱ رقم باشد'); return; }
    setError(''); setSending(true);
    try { await api.auth.requestOtp(phone); setStep('code'); setCooldown(60); }
    catch (err) { setError((err as Error).message); }
    finally { setSending(false); }
  }

  async function verify(entered = code) {
    if (entered.length < 4) return;
    setLoading(true); setError('');
    try {
      const res = mode === 'login'
        ? await api.auth.login(phone, entered)
        : await api.auth.register({
            phone, code: entered, name, role, workshopName, workshopAddress,
            workingHours: workingHours ?? undefined,
          });
      localStorage.setItem('vtoken', res.access_token);
      localStorage.setItem('vuser', JSON.stringify(res.user));
      router.push(nextTarget || homeFor(res.user.role));
    } catch (err) { setError((err as Error).message); setCode(''); }
    finally { setLoading(false); }
  }

  const steps: Step[] = mode === 'register' ? ['role', 'profile', 'code'] : ['profile', 'code'];
  const atIndex = steps.indexOf(step);

  return (
    <main className="au">
      <span className="au-blob au-blob-a" aria-hidden="true" />
      <span className="au-blob au-blob-b" aria-hidden="true" />

      <div className="au-wrap">
        <header className="au-top">
          <Link href="/" className="au-back" style={{ background: C.surfaceSolid, color: C.text2, boxShadow: C.shadowSoft }}>
            <ChevronRightIcon size={17} />
          </Link>
          <span className="au-brand">
            <img src="/icon-192.png" alt="" width={30} height={30} />
            <b style={{ color: C.textStrong }}>دستیار خودرو</b>
          </span>
        </header>

        <div className="au-card" style={{ background: C.surfaceSolid, boxShadow: C.shadowHero }}>
          <div className="au-switch" style={{ background: C.fill2 }}>
            {(['login', 'register'] as const).map((m) => (
              <button key={m} type="button" onClick={() => switchMode(m)}
                aria-pressed={mode === m}
                style={{
                  background: mode === m ? C.surfaceSolid : 'transparent',
                  color: mode === m ? C.textStrong : C.muted,
                  boxShadow: mode === m ? C.shadowSoft : 'none',
                }}>
                {m === 'login' ? 'ورود' : 'ثبت‌نام'}
              </button>
            ))}
          </div>

          {/* progress — only worth showing when there is more than one step left */}
          {steps.length > 1 && (
            <div className="au-dots" aria-hidden="true">
              {steps.map((s, i) => (
                <i key={s} style={{
                  background: i <= atIndex ? C.green : C.fill3,
                  width: i === atIndex ? 22 : 7,
                }} />
              ))}
            </div>
          )}

          {step === 'role' && (
            <>
              <h1 style={{ color: C.textStrong }}>با کدام نقش شروع می‌کنی؟</h1>
              <p className="au-sub" style={{ color: C.text2 }}>هر نقش صفحه و ابزارهای خودش را دارد.</p>
              <div className="au-roles">
                {ROLES.map((r) => {
                  const on = role === r.v;
                  return (
                    <button key={r.v} type="button" onClick={() => setRole(r.v)} aria-pressed={on}
                      className={`au-role${on ? ' on' : ''}`}
                      style={{
                        background: on ? alpha(C.green, 9) : C.fill1,
                        boxShadow: on ? `inset 0 0 0 1.5px ${alpha(C.green, 50)}` : `inset 0 0 0 1px ${C.border}`,
                      }}>
                      <span className="au-role-ico" style={{ background: alpha(on ? C.green : C.muted, 12), color: on ? C.green : C.muted }}>
                        {r.icon}
                      </span>
                      <span className="au-role-txt">
                        <b style={{ color: C.textStrong }}>{r.label}</b>
                        <small style={{ color: C.muted }}>{r.sub}</small>
                      </span>
                      {on && <i className="au-role-tick" style={{ background: C.green, color: C.onAccent }}><CheckIcon size={12} /></i>}
                    </button>
                  );
                })}
              </div>
              {role === 'mechanic' ? (
                <>
                  <p className="au-note" style={{ background: alpha(C.green, 8), color: C.text2 }}>
                    ثبت تعمیرگاه چند قدم کوتاه دارد — می‌پرسیم چه خدماتی می‌دهی و کجا کار می‌کنی تا کارگاهت از همان اول کامل باشد.
                  </p>
                  <Button fullWidth size="lg" onClick={() => router.push('/join/mechanic')} icon={<WrenchIcon size={16} />}>
                    شروع ثبت تعمیرگاه
                  </Button>
                </>
              ) : (
                <Button fullWidth size="lg" onClick={() => setStep('profile')}>ادامه</Button>
              )}
            </>
          )}

          {step === 'profile' && (
            <form onSubmit={(e) => { e.preventDefault(); sendOtp(); }}>
              <h1 style={{ color: C.textStrong }}>{mode === 'login' ? 'خوش برگشتی' : 'کمی درباره‌ات بگو'}</h1>
              <p className="au-sub" style={{ color: C.text2 }}>
                {mode === 'login'
                  ? 'شماره‌ات را بده، یک کد چهار رقمی می‌فرستیم. رمزی در کار نیست.'
                  : 'همین چند مورد کافی است تا حسابت ساخته شود.'}
              </p>

              <div className="au-fields">
                {mode === 'register' && (
                  <label className="au-f">
                    <span style={{ color: C.muted }}>نام و نام خانوادگی</span>
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلاً رضا احمدی" required />
                  </label>
                )}
                {mode === 'register' && role === 'seller' && (
                  <>
                    <label className="au-f">
                      <span style={{ color: C.muted }}>نام فروشگاه</span>
                      <Input value={workshopName} onChange={(e) => setWorkshopName(e.target.value)} placeholder="مثلاً لوازم یدکی پارس" required />
                    </label>
                    <label className="au-f">
                      <span style={{ color: C.muted }}>آدرس یا محدوده فعالیت</span>
                      <Input value={workshopAddress} onChange={(e) => setWorkshopAddress(e.target.value)} placeholder="مثلاً تهران، پیروزی" />
                    </label>
                    <div className="au-f">
                      <span style={{ color: C.muted }}>ساعت کاری <i style={{ fontStyle: 'normal', color: C.subtle }}>(اختیاری)</i></span>
                      <WorkingHoursEditor value={workingHours} onChange={setWorkingHours} />
                    </div>
                  </>
                )}
                <label className="au-f">
                  <span style={{ color: C.muted }}>شماره موبایل</span>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    placeholder="09123456789" type="tel" inputMode="numeric" autoComplete="tel"
                    required dir="ltr" style={{ textAlign: 'left', letterSpacing: 1 }} />
                </label>
              </div>

              {error && <p className="au-err" role="alert" style={{ color: C.statusExpired, background: alpha(C.statusExpired, 10) }}>{error}</p>}

              <Button type="submit" fullWidth size="lg" loading={sending} icon={<LockIcon size={15} />}>
                ارسال کد تایید
              </Button>
              {mode === 'register' && (
                <button type="button" className="au-link" onClick={() => setStep('role')} style={{ color: C.muted }}>
                  تغییر نقش
                </button>
              )}
            </form>
          )}

          {step === 'code' && (
            <form onSubmit={(e) => { e.preventDefault(); verify(); }}>
              <h1 style={{ color: C.textStrong }}>کد را وارد کن</h1>
              <p className="au-sub" style={{ color: C.text2 }}>
                کد چهار رقمی به <bdi dir="ltr" style={{ fontWeight: 800, color: C.text }}>{phone}</bdi> پیامک شد.
              </p>

              <OtpInput value={code} onChange={setCode} autoFocus invalid={!!error} onComplete={(v) => verify(v)} />

              {error && <p className="au-err" role="alert" style={{ color: C.statusExpired, background: alpha(C.statusExpired, 10) }}>{error}</p>}

              <Button type="submit" fullWidth size="lg" loading={loading} disabled={code.length < 4}>
                {mode === 'login' ? 'ورود' : 'ساخت حساب'}
              </Button>

              <div className="au-row">
                <button type="button" onClick={() => { setStep('profile'); setCode(''); setError(''); }} style={{ color: C.muted }}>
                  ویرایش شماره
                </button>
                <button type="button" onClick={sendOtp} disabled={cooldown > 0 || sending}
                  style={{ color: cooldown > 0 ? C.subtle : C.green }}>
                  {cooldown > 0 ? `ارسال مجدد تا ${fa(cooldown)} ثانیه` : 'ارسال مجدد کد'}
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="au-trust" style={{ color: C.muted }}>
          <ShieldIcon size={13} /> شماره‌ات فقط برای ورود و هماهنگی سرویس استفاده می‌شود.
        </p>
      </div>

      <style jsx>{`
        .au{position:relative;min-height:100dvh;display:grid;place-items:center;padding:20px 16px 36px;overflow:hidden;background:var(--bg)}
        .au-blob{position:absolute;border-radius:50%;filter:blur(70px);pointer-events:none}
        .au-blob-a{width:320px;height:320px;top:-110px;inset-inline-start:-90px;background:color-mix(in srgb,var(--brand) 26%,transparent)}
        .au-blob-b{width:280px;height:280px;bottom:-120px;inset-inline-end:-80px;background:color-mix(in srgb,var(--svc-ac) 22%,transparent)}
        .au-wrap{position:relative;width:100%;max-width:430px}
        .au-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}
        :global(.au-back){width:40px;height:40px;border-radius:13px;display:grid;place-items:center;text-decoration:none}
        .au-brand{display:flex;align-items:center;gap:8px}
        .au-brand img{border-radius:9px}
        .au-brand b{font-size:15px;font-weight:900}
        .au-card{border-radius:26px;padding:20px 18px 22px}
        .au-switch{display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:4px;border-radius:15px;margin-bottom:18px}
        .au-switch button{border:0;cursor:pointer;border-radius:12px;padding:11px;font:900 13.5px var(--font-sans);
                          transition:background var(--dur-move,220ms) var(--ease-soft,ease),color var(--dur-move,220ms) var(--ease-soft,ease)}
        .au-dots{display:flex;align-items:center;gap:5px;margin-bottom:16px}
        .au-dots i{height:7px;border-radius:99px;transition:width var(--dur-move,260ms) var(--ease-soft,ease),background var(--dur-move,260ms) var(--ease-soft,ease)}
        h1{margin:0 0 6px;font-size:19px;font-weight:950;line-height:1.5;text-wrap:balance}
        .au-sub{margin:0 0 18px;font-size:13px;line-height:1.95}
        .au-fields{display:flex;flex-direction:column;gap:12px;margin-bottom:14px}
        .au-f{display:block}
        .au-f>span{display:block;font-size:11.5px;font-weight:800;margin-bottom:6px}
        .au-roles{display:flex;flex-direction:column;gap:9px;margin-bottom:14px}
        .au-role{position:relative;display:flex;align-items:center;gap:11px;text-align:start;border:0;cursor:pointer;
                 border-radius:17px;padding:13px;font-family:var(--font-sans);
                 transition:box-shadow var(--dur-move,220ms) var(--ease-soft,ease),background var(--dur-move,220ms) var(--ease-soft,ease),transform var(--dur-press,120ms) var(--ease-soft,ease)}
        .au-role:active{transform:scale(.985)}
        .au-role-ico{width:42px;height:42px;border-radius:13px;display:grid;place-items:center;flex-shrink:0;
                     transition:background var(--dur-move,220ms) var(--ease-soft,ease),color var(--dur-move,220ms) var(--ease-soft,ease)}
        .au-role-txt{flex:1;min-width:0}
        .au-role-txt b{display:block;font-size:14px;font-weight:900}
        .au-role-txt small{display:block;font-size:11.5px;line-height:1.7;margin-top:2px}
        .au-role-tick{width:20px;height:20px;border-radius:50%;display:grid;place-items:center;flex-shrink:0}
        .au-note{margin:0 0 12px;font-size:12px;line-height:1.95;padding:11px 13px;border-radius:14px}
        .au-err{margin:12px 0 0;font-size:12.5px;font-weight:700;line-height:1.8;padding:10px 12px;border-radius:12px}
        .au-link{display:block;width:100%;margin-top:12px;border:0;background:transparent;cursor:pointer;
                 font:800 12.5px var(--font-sans);text-align:center}
        .au-row{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:14px}
        .au-row button{border:0;background:transparent;cursor:pointer;font:800 12.5px var(--font-sans)}
        .au-row button:disabled{cursor:default}
        .au-trust{display:flex;align-items:center;justify-content:center;gap:6px;margin:16px 0 0;font-size:11.5px;line-height:1.8;text-align:center}
        @media (prefers-reduced-motion: reduce){ .au-role:active{transform:none} }
      `}</style>
    </main>
  );
}
