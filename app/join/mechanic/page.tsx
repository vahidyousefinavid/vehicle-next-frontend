'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, PresetService, ImportServiceItem } from '@/lib/api';
import { alpha, Button, C, Input, TextArea, Spinner } from '@/components/ui';
import ThemeToggle from '@/components/ThemeToggle';
import { svcMeta } from '@/components/serviceMeta';
import {
  CarIcon, CheckIcon, ChevronRightIcon, PinIcon, SearchIcon, StoreIcon,
  NavigationIcon, WrenchIcon, XIcon, ShieldIcon, PhoneIcon,
} from '@/components/icons';

/**
 * ثبت‌نام مکانیک، مرحله‌به‌مرحله.
 *
 * فرم قبلی همه‌چیز را یکجا می‌پرسید و چیزی از تخصص مکانیک نمی‌دانست، پس
 * تعمیرگاه با یک لیست خدمات خالی ساخته می‌شد. اینجا هر مرحله فقط یک سؤال
 * می‌پرسد و خدمات انتخاب‌شده در همان درخواست ثبت‌نام ثبت می‌شوند.
 */

type StepKey = 'identity' | 'skills' | 'place' | 'verify';

const STEPS: { key: StepKey; label: string; title: string; hint: string }[] = [
  { key: 'identity', label: 'معرفی',   title: 'تعمیرگاهت را معرفی کن',      hint: 'همین دو مورد برای ساختن پروفایل کافی است.' },
  { key: 'skills',   label: 'تخصص‌ها', title: 'چه کارهایی انجام می‌دهی؟',   hint: 'هر چه دقیق‌تر انتخاب کنی، مشتری مرتبط‌تری پیدا می‌کنی.' },
  { key: 'place',    label: 'محل کار', title: 'کجا خدمت می‌دهی؟',           hint: 'می‌توانی در تعمیرگاه، در محل مشتری، یا هر دو کار کنی.' },
  { key: 'verify',   label: 'تایید',   title: 'شماره‌ات را تایید کن',        hint: 'یک کد چهار رقمی برایت می‌فرستیم و تمام.' },
];

const DRAFT_KEY = 'mechanic-signup-draft';

interface Draft {
  name: string; workshopName: string; address: string;
  inShop: boolean; onSite: boolean;
  lat?: number; lng?: number;
  picked: string[];
}

const emptyDraft: Draft = { name: '', workshopName: '', address: '', inShop: true, onSite: false, picked: [] };

export default function JoinMechanicPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [restored, setRestored] = useState(false);

  /* verification */
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  /* catalogue */
  const [services, setServices] = useState<PresetService[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [q, setQ] = useState('');
  const [activeCat, setActiveCat] = useState('');

  const set = useCallback((patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch })), []);

  /* a refresh mid-signup should not cost the answers already given */
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) setDraft({ ...emptyDraft, ...JSON.parse(raw) });
    } catch { /* a corrupt draft is not worth failing over */ }
    setRestored(true);
  }, []);
  useEffect(() => {
    if (!restored) return;
    try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch { /* private mode */ }
  }, [draft, restored]);

  useEffect(() => {
    if (localStorage.getItem('vtoken')) router.replace('/mechanic');
  }, [router]);

  useEffect(() => {
    api.catalog.publicServices()
      .then((res) => { setServices(res.items); setCategories(res.categories); })
      .catch(() => setError('فهرست خدمات بارگذاری نشد؛ اتصال اینترنت را بررسی کن.'))
      .finally(() => setCatalogLoading(false));
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const pickedSet = useMemo(() => new Set(draft.picked), [draft.picked]);
  const shown = useMemo(() => {
    const needle = q.trim();
    return services.filter((s) => {
      if (activeCat && s.category !== activeCat) return false;
      if (!needle) return true;
      return `${s.customName ?? ''} ${s.serviceType} ${s.category}`.includes(needle);
    });
  }, [services, q, activeCat]);

  const grouped = useMemo(() => {
    const map = new Map<string, PresetService[]>();
    for (const s of shown) map.set(s.category, [...(map.get(s.category) ?? []), s]);
    return [...map.entries()];
  }, [shown]);

  function toggleService(key: string) {
    setDraft((d) => ({
      ...d,
      picked: d.picked.includes(key) ? d.picked.filter((k) => k !== key) : [...d.picked, key],
    }));
  }

  /* ── per-step validity ─────────────────────────────────────────────── */
  const problem = useMemo<string | null>(() => {
    if (step === 0) {
      if (!draft.workshopName.trim()) return 'نام تعمیرگاه را وارد کن';
      if (!draft.name.trim()) return 'نام و نام خانوادگی‌ات را وارد کن';
    }
    if (step === 1 && draft.picked.length === 0) return 'حداقل یک خدمت انتخاب کن';
    if (step === 2 && !draft.inShop && !draft.onSite) return 'حداقل یکی از حالت‌های ارائه را انتخاب کن';
    if (step === 3) {
      if (!/^09\d{9}$/.test(phone.trim())) return 'شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود';
      if (otpSent && code.length !== 4) return 'کد چهار رقمی را وارد کن';
    }
    return null;
  }, [step, draft, phone, code, otpSent]);

  function next() {
    if (problem) { setError(problem); return; }
    setError('');
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function back() {
    setError('');
    if (step === 0) router.push('/');
    else setStep((s) => s - 1);
  }

  async function sendOtp() {
    if (problem) { setError(problem); return; }
    setBusy(true); setError('');
    try { await api.auth.requestOtp(phone.trim()); setOtpSent(true); setCooldown(60); }
    catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  }

  function captureLocation() {
    if (!navigator.geolocation) { setError('مرورگر تو موقعیت مکانی را پشتیبانی نمی‌کند'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => set({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setError('دسترسی به موقعیت مکانی داده نشد'),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  async function submit() {
    if (problem) { setError(problem); return; }
    setBusy(true); setError('');
    try {
      // a service is only offered on-site if both the mechanic and the service
      // itself allow it — nobody changes a timing belt at the roadside
      const chosen: ImportServiceItem[] = draft.picked.map((key) => {
        const preset = services.find((s) => s.key === key);
        return {
          key,
          supportsInShop: draft.inShop && (preset?.supportsInShop ?? true),
          supportsOnSite: draft.onSite && (preset?.supportsOnSite ?? false),
        };
      });

      const res = await api.auth.register({
        phone: phone.trim(), code, name: draft.name.trim(), role: 'mechanic',
        workshopName: draft.workshopName.trim(),
        workshopAddress: draft.address.trim() || undefined,
        workshopLat: draft.lat, workshopLng: draft.lng,
        services: chosen,
      });
      localStorage.setItem('vtoken', res.access_token);
      localStorage.setItem('vuser', JSON.stringify(res.user));
      sessionStorage.removeItem(DRAFT_KEY);
      setDone(true);
      setTimeout(() => router.push('/mechanic'), 1600);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const pct = done ? 100 : Math.round(((step + 1) / STEPS.length) * 100);
  const current = STEPS[step];

  if (done) return <SuccessScreen workshopName={draft.workshopName} count={draft.picked.length} />;

  return (
    <main className="join">
      <aside className="join-rail">
        <div className="join-brand">
          <span style={{ color: C.green, background: alpha(C.green, 12), border: `1px solid ${alpha(C.green, 30)}` }}>
            <WrenchIcon size={22} />
          </span>
          <div>
            <strong style={{ color: C.textStrong }}>ثبت تعمیرگاه</strong>
            <small style={{ color: C.muted }}>دستیار خودرو</small>
          </div>
        </div>

        <h1 style={{ color: C.textStrong }}>تعمیرگاهت را در چند قدم بساز</h1>
        <p style={{ color: C.text2 }}>
          فقط چیزهایی را می‌پرسیم که برای دیده‌شدن تعمیرگاهت لازم است. کمتر از دو دقیقه.
        </p>

        <ol className="join-steps">
          {STEPS.map((s, i) => {
            const state = i < step ? 'done' : i === step ? 'active' : 'todo';
            return (
              <li key={s.key} data-state={state}>
                <span
                  className="step-dot"
                  style={{
                    color: state === 'todo' ? C.muted : C.onAccent,
                    background: state === 'todo' ? C.fill2 : `linear-gradient(135deg, ${C.green}, ${C.greenDark})`,
                    border: `1px solid ${state === 'todo' ? C.border : alpha(C.green, 60)}`,
                  }}
                >
                  {state === 'done' ? <CheckIcon size={13} /> : (i + 1).toLocaleString('fa-IR')}
                </span>
                <b style={{ color: state === 'todo' ? C.muted : C.textStrong }}>{s.label}</b>
              </li>
            );
          })}
        </ol>

        <div className="join-assure" style={{ background: C.fill1, border: `1px solid ${C.border}` }}>
          <ShieldIcon size={15} />
          <span style={{ color: C.text2 }}>قیمت‌ها پیشنهادی‌اند و بعد از ورود قابل ویرایش‌اند.</span>
        </div>
      </aside>

      <section className="join-stage">
        <header className="join-topbar">
          <button type="button" onClick={back} className="join-back" style={{ color: C.text2, background: C.fill2, border: `1px solid ${C.border}` }}>
            <ChevronRightIcon size={16} />
            {step === 0 ? 'بازگشت' : 'مرحله قبل'}
          </button>
          <div className="join-progress-wrap">
            <div className="join-progress" style={{ background: C.fill2 }}>
              <i style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${C.greenDark}, ${C.green})` }} />
            </div>
            <small style={{ color: C.muted }}>مرحله {(step + 1).toLocaleString('fa-IR')} از {STEPS.length.toLocaleString('fa-IR')}</small>
          </div>
          <ThemeToggle size={36} />
        </header>

        <div key={step} className="join-card" style={{ background: C.surfaceSolid, border: `1px solid ${C.borderStrong}`, boxShadow: C.shadowHero }}>
          <div className="join-head">
            <h2 style={{ color: C.textStrong }}>{current.title}</h2>
            <p style={{ color: C.text2 }}>{current.hint}</p>
          </div>

          {step === 0 && (
            <div className="join-fields">
              <label style={{ color: C.muted }}>نام تعمیرگاه</label>
              <Input
                value={draft.workshopName}
                onChange={(e) => set({ workshopName: e.target.value })}
                placeholder="مثلاً: تعمیرگاه مرکزی سعادت"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') next(); }}
              />
              <label style={{ color: C.muted }}>نام و نام خانوادگی</label>
              <Input
                value={draft.name}
                onChange={(e) => set({ name: e.target.value })}
                placeholder="نام مسئول تعمیرگاه"
                onKeyDown={(e) => { if (e.key === 'Enter') next(); }}
              />
            </div>
          )}

          {step === 1 && (
            <div className="join-skills">
              <div className="skills-search">
                <SearchIcon size={16} />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="جستجوی خدمت..."
                  style={{ color: C.textStrong }}
                />
                {draft.picked.length > 0 && (
                  <span className="skills-count" style={{ color: C.green, background: alpha(C.green, 12), border: `1px solid ${alpha(C.green, 30)}` }}>
                    {draft.picked.length.toLocaleString('fa-IR')} انتخاب‌شده
                  </span>
                )}
              </div>

              <div className="skills-cats">
                {['', ...categories].map((cat) => (
                  <button
                    key={cat || 'all'}
                    type="button"
                    onClick={() => setActiveCat(cat)}
                    style={{
                      color: activeCat === cat ? C.textStrong : C.muted,
                      background: activeCat === cat ? alpha(C.green, 12) : C.fill2,
                      border: `1px solid ${activeCat === cat ? alpha(C.green, 40) : C.border}`,
                    }}
                  >
                    {cat || 'همه'}
                  </button>
                ))}
              </div>

              {catalogLoading ? <Spinner /> : grouped.length === 0 ? (
                <p className="skills-empty" style={{ color: C.muted }}>خدمتی با این جستجو پیدا نشد.</p>
              ) : (
                <div className="skills-scroll">
                  {grouped.map(([cat, items]) => (
                    <div key={cat} className="skills-group">
                      <h3 style={{ color: C.muted }}>{cat}</h3>
                      <div className="skills-grid">
                        {items.map((s) => {
                          const on = pickedSet.has(s.key);
                          const meta = svcMeta(s.serviceType, s.customName);
                          const Icon = meta.icon;
                          return (
                            <button
                              key={s.key}
                              type="button"
                              onClick={() => toggleService(s.key)}
                              aria-pressed={on}
                              className={`skill-chip ${on ? 'on' : ''}`}
                              style={{
                                background: on ? alpha(meta.color, 12) : C.surfaceSolid,
                                border: `1px solid ${on ? alpha(meta.color, 55) : C.border}`,
                                boxShadow: on ? `0 10px 26px ${alpha(meta.color, 16)}` : 'none',
                              }}
                            >
                              <span className="skill-icon" style={{ color: meta.color, background: alpha(meta.color, 12) }}>
                                <Icon size={18} />
                              </span>
                              <b style={{ color: C.textStrong }}>{s.customName || s.serviceType}</b>
                              <small style={{ color: C.muted }}>
                                {s.suggestedPrice ? `${s.suggestedPrice.toLocaleString('fa-IR')} تومان` : 'قیمت توافقی'}
                                {s.availableNow === false && (
                                  <em style={{ fontStyle: 'normal', color: C.subtle }}> · به‌زودی</em>
                                )}
                              </small>
                              <i className="skill-tick" style={{ color: on ? meta.color : 'transparent' }}>
                                <CheckIcon size={15} />
                              </i>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="join-fields">
              <div className="mode-grid">
                {[
                  { on: draft.inShop, toggle: () => set({ inShop: !draft.inShop }), icon: <StoreIcon size={22} />, t: 'در تعمیرگاه', d: 'مشتری ماشین را می‌آورد' },
                  { on: draft.onSite, toggle: () => set({ onSite: !draft.onSite }), icon: <NavigationIcon size={22} />, t: 'در محل مشتری', d: 'خودت سر کار می‌روی' },
                ].map((m) => (
                  <button
                    key={m.t}
                    type="button"
                    onClick={m.toggle}
                    aria-pressed={m.on}
                    className={`mode-card ${m.on ? 'on' : ''}`}
                    style={{
                      background: m.on ? alpha(C.green, 10) : C.surfaceSolid,
                      border: `1px solid ${m.on ? alpha(C.green, 50) : C.border}`,
                    }}
                  >
                    <span style={{ color: m.on ? C.green : C.muted, background: m.on ? alpha(C.green, 12) : C.fill3 }}>{m.icon}</span>
                    <b style={{ color: C.textStrong }}>{m.t}</b>
                    <small style={{ color: C.muted }}>{m.d}</small>
                    {m.on && <i style={{ color: C.green }}><CheckIcon size={15} /></i>}
                  </button>
                ))}
              </div>

              <label style={{ color: C.muted }}>آدرس یا محدوده فعالیت <span style={{ color: C.subtle }}>(اختیاری)</span></label>
              <TextArea
                value={draft.address}
                onChange={(e) => set({ address: e.target.value })}
                placeholder="مثلاً: همدان، خیابان بوعلی، نبش کوچه دوم — یا فقط نام محدوده‌ای که در آن کار می‌کنی"
                rows={3}
              />
              <button type="button" onClick={captureLocation} className="locate-btn" style={{ color: draft.lat ? C.green : C.text2, background: C.fill2, border: `1px solid ${draft.lat ? alpha(C.green, 40) : C.border}` }}>
                <PinIcon size={15} />
                {draft.lat ? 'موقعیت ثبت شد — برای اصلاح دوباره بزن' : 'ثبت موقعیت فعلی روی نقشه'}
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="join-fields">
              <label style={{ color: C.muted }}>شماره موبایل</label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                placeholder="09123456789"
                type="tel"
                dir="ltr"
                readOnly={otpSent}
                autoFocus
                style={{ textAlign: 'left', opacity: otpSent ? 0.7 : 1 }}
                onKeyDown={(e) => { if (e.key === 'Enter' && !otpSent) sendOtp(); }}
              />

              {otpSent && (
                <>
                  <label style={{ color: C.muted }}>کد چهار رقمی پیامک‌شده</label>
                  <div className="otp-line">
                    <Input
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      inputMode="numeric"
                      dir="ltr"
                      autoFocus
                      style={{ textAlign: 'center', letterSpacing: 8, fontSize: 20, fontWeight: 900 }}
                      onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
                    />
                    <button type="button" onClick={sendOtp} disabled={cooldown > 0 || busy} style={{ color: cooldown > 0 ? C.muted : C.green }}>
                      {cooldown > 0 ? `${cooldown.toLocaleString('fa-IR')} ثانیه` : 'ارسال مجدد'}
                    </button>
                  </div>
                  <button type="button" onClick={() => { setOtpSent(false); setCode(''); setError(''); }} className="edit-phone" style={{ color: C.green }}>
                    ویرایش شماره موبایل
                  </button>
                </>
              )}

              <Summary draft={draft} services={services} />
            </div>
          )}

          {error && (
            <div className="join-error" role="alert" style={{ color: C.statusExpired, background: alpha(C.statusExpired, 10), border: `1px solid ${alpha(C.statusExpired, 24)}` }}>
              <XIcon size={14} /> {error}
            </div>
          )}

          <div className="join-actions">
            {step < 3 && (
              <Button size="lg" fullWidth onClick={next} disabled={!!problem} icon={<ChevronRightIcon size={16} />}>
                ادامه
              </Button>
            )}
            {step === 3 && !otpSent && (
              <Button size="lg" fullWidth onClick={sendOtp} loading={busy} disabled={!!problem} icon={<PhoneIcon size={16} />}>
                ارسال کد تایید
              </Button>
            )}
            {step === 3 && otpSent && (
              <Button size="lg" fullWidth onClick={submit} loading={busy} disabled={!!problem} icon={<CheckIcon size={16} />}>
                ساخت تعمیرگاه و ورود
              </Button>
            )}
            {problem && !error && <small className="join-nudge" style={{ color: C.subtle }}>{problem}</small>}
          </div>
        </div>
      </section>

      <style>{JOIN_CSS}</style>
    </main>
  );
}

/* ── the last screen before the dashboard ────────────────────────────── */

function SuccessScreen({ workshopName, count }: { workshopName: string; count: number }) {
  return (
    <main className="join-done">
      <div className="done-card" style={{ background: C.surfaceSolid, border: `1px solid ${C.borderStrong}`, boxShadow: C.shadowHero }}>
        <span className="done-tick" style={{ color: C.onAccent, background: `linear-gradient(135deg, ${C.green}, ${C.greenDark})` }}>
          <CheckIcon size={30} />
        </span>
        <h1 style={{ color: C.textStrong }}>{workshopName} ساخته شد</h1>
        <p style={{ color: C.text2 }}>
          {count.toLocaleString('fa-IR')} خدمت روی تعمیرگاهت ثبت شد. در حال بردنت به داشبورد...
        </p>
        <Spinner />
      </div>
      <style>{JOIN_CSS}</style>
    </main>
  );
}

/* ── a compact read-back before the final tap ────────────────────────── */

function Summary({ draft, services }: { draft: Draft; services: PresetService[] }) {
  const names = draft.picked
    .map((k) => services.find((s) => s.key === k))
    .filter(Boolean)
    .map((s) => s!.customName || s!.serviceType);
  const shown = names.slice(0, 4);
  const rest = names.length - shown.length;

  return (
    <div className="join-summary" style={{ background: C.fill1, border: `1px solid ${C.border}` }}>
      <div><span style={{ color: C.muted }}>تعمیرگاه</span><b style={{ color: C.textStrong }}>{draft.workshopName || '—'}</b></div>
      <div><span style={{ color: C.muted }}>مسئول</span><b style={{ color: C.textStrong }}>{draft.name || '—'}</b></div>
      <div>
        <span style={{ color: C.muted }}>نحوه ارائه</span>
        <b style={{ color: C.textStrong }}>
          {[draft.inShop && 'در تعمیرگاه', draft.onSite && 'در محل مشتری'].filter(Boolean).join(' و ') || '—'}
        </b>
      </div>
      <div className="summary-services">
        <span style={{ color: C.muted }}>خدمات</span>
        <div>
          {shown.map((n) => <em key={n} style={{ color: C.text2, background: C.fill3, border: `1px solid ${C.border}` }}>{n}</em>)}
          {rest > 0 && <em style={{ color: C.green, background: alpha(C.green, 10), border: `1px solid ${alpha(C.green, 26)}` }}>+{rest.toLocaleString('fa-IR')} مورد</em>}
        </div>
      </div>
    </div>
  );
}

const JOIN_CSS = `
.join{min-height:100dvh;display:grid;grid-template-columns:minmax(0,.85fr) minmax(0,1.15fr);background:var(--bg-gradient)}
.join-rail{padding:44px 40px;border-left:1px solid var(--border);display:flex;flex-direction:column;gap:22px}
.join-brand{display:flex;align-items:center;gap:11px}
.join-brand>span{width:46px;height:46px;border-radius:16px;display:grid;place-items:center}
.join-brand strong,.join-brand small{display:block}
.join-brand small{font-size:11px;margin-top:2px}
.join-rail h1{font-size:clamp(26px,3vw,40px);line-height:1.35;letter-spacing:-.8px;margin:14px 0 0}
.join-rail>p{font-size:14px;line-height:2;margin:0}
.join-steps{list-style:none;margin:8px 0 0;padding:0;display:grid;gap:14px}
.join-steps li{display:flex;align-items:center;gap:11px;transition:opacity .2s ease}
.join-steps li[data-state=todo]{opacity:.55}
.step-dot{width:30px;height:30px;border-radius:11px;display:grid;place-items:center;font:900 12px var(--font-sans);flex-shrink:0}
.join-steps b{font-size:13.5px;font-weight:900}
.join-assure{margin-top:auto;border-radius:16px;padding:13px 15px;display:flex;gap:9px;align-items:flex-start;font-size:12px;line-height:1.8;color:var(--green)}
.join-stage{padding:26px 30px 44px;display:flex;flex-direction:column;gap:18px;min-width:0}
.join-topbar{display:flex;align-items:center;gap:14px}
.join-back{display:inline-flex;align-items:center;gap:6px;border-radius:13px;padding:9px 14px;font:900 12.5px var(--font-sans);cursor:pointer;flex-shrink:0}
.join-progress-wrap{flex:1;min-width:0;display:grid;gap:6px}
.join-progress{height:7px;border-radius:99px;overflow:hidden}
.join-progress i{display:block;height:100%;border-radius:99px;transition:width .35s cubic-bezier(.4,0,.2,1)}
.join-progress-wrap small{font-size:11px;font-weight:800}
.join-card{border-radius:30px;padding:30px;display:flex;flex-direction:column;gap:20px;flex:1;min-height:0;animation:joinIn .28s cubic-bezier(.16,1,.3,1)}
@keyframes joinIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@media(prefers-reduced-motion:reduce){.join-card{animation:none}.join-progress i{transition:none}}
.join-head h2{font-size:clamp(21px,2.6vw,30px);line-height:1.4;margin:0 0 8px;letter-spacing:-.4px}
.join-head p{font-size:13.5px;line-height:1.9;margin:0}
.join-fields{display:flex;flex-direction:column;gap:9px}
.join-fields label{font-size:11.5px;font-weight:900;margin-top:6px}
.mode-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:6px}
.mode-card{position:relative;border-radius:22px;padding:18px;text-align:right;cursor:pointer;font-family:var(--font-sans);display:flex;flex-direction:column;gap:5px;align-items:flex-start;transition:transform .16s ease,border-color .16s ease}
.mode-card:hover{transform:translateY(-2px)}
.mode-card>span{width:46px;height:46px;border-radius:16px;display:grid;place-items:center;margin-bottom:6px}
.mode-card b{font-size:15px}
.mode-card small{font-size:11.5px;line-height:1.7}
.mode-card i{position:absolute;top:16px;left:16px}
.locate-btn{margin-top:8px;border-radius:14px;padding:12px 15px;display:inline-flex;align-items:center;gap:8px;font:900 12.5px var(--font-sans);cursor:pointer;justify-content:center}
.join-skills{display:flex;flex-direction:column;gap:13px;min-height:0;flex:1}
.skills-search{display:flex;align-items:center;gap:9px;border-radius:15px;padding:11px 14px;background:var(--surface-solid);border:1px solid var(--border);color:var(--muted)}
.skills-search input{flex:1;min-width:0;background:transparent;border:0;outline:0;font:800 13.5px var(--font-sans)}
.skills-count{border-radius:99px;padding:5px 10px;font:900 11px var(--font-sans);white-space:nowrap}
.skills-cats{display:flex;gap:7px;overflow-x:auto;scrollbar-width:none;padding-bottom:2px}
.skills-cats::-webkit-scrollbar{display:none}
.skills-cats button{flex:0 0 auto;border-radius:99px;padding:8px 14px;font:900 12px var(--font-sans);cursor:pointer}
.skills-scroll{overflow-y:auto;max-height:min(46vh,430px);display:grid;gap:16px;padding-left:4px}
.skills-group h3{font-size:11.5px;font-weight:900;margin:0 0 9px}
.skills-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(178px,1fr));gap:10px}
.skill-chip{position:relative;border-radius:19px;padding:14px;text-align:right;cursor:pointer;font-family:var(--font-sans);display:grid;grid-template-columns:auto 1fr;gap:2px 10px;align-items:center;transition:transform .16s ease,border-color .16s ease,box-shadow .16s ease}
.skill-chip:hover{transform:translateY(-2px)}
.skill-icon{grid-row:span 2;width:38px;height:38px;border-radius:13px;display:grid;place-items:center}
.skill-chip b{font-size:13px;line-height:1.5;padding-left:18px}
.skill-chip small{font-size:11px}
.skill-tick{position:absolute;top:12px;left:12px;transition:color .16s ease}
.skills-empty{font-size:13px;text-align:center;padding:30px 0}
.otp-line{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center}
.otp-line button,.edit-phone{border:0;background:transparent;cursor:pointer;font:800 12px var(--font-sans);white-space:nowrap;padding:6px 2px;text-align:right}
.join-summary{border-radius:18px;padding:15px 17px;display:grid;gap:11px;margin-top:14px}
.join-summary>div{display:flex;justify-content:space-between;gap:14px;align-items:baseline}
.join-summary span{font-size:11.5px;font-weight:800;flex-shrink:0}
.join-summary b{font-size:12.5px;text-align:left}
.summary-services{flex-direction:column;align-items:stretch}
.summary-services>div{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.summary-services em{font-style:normal;border-radius:99px;padding:5px 10px;font-size:11px;font-weight:800}
.join-error{border-radius:14px;padding:11px 14px;font-size:12.5px;font-weight:800;display:flex;align-items:center;gap:7px}
.join-actions{margin-top:auto;display:grid;gap:8px}
.join-nudge{font-size:11px;text-align:center;font-weight:700}
.join-done{min-height:100dvh;display:grid;place-items:center;padding:20px;background:var(--bg-gradient)}
.done-card{border-radius:32px;padding:44px 34px;text-align:center;max-width:460px;display:grid;justify-items:center;gap:12px}
.done-tick{width:74px;height:74px;border-radius:26px;display:grid;place-items:center;margin-bottom:6px}
.done-card h1{font-size:26px;margin:0}
.done-card p{font-size:13.5px;line-height:1.9;margin:0}
@media(max-width:940px){
  .join{grid-template-columns:1fr}
  .join-rail{padding:20px 16px 0;border-left:0;gap:14px}
  .join-rail h1{font-size:23px;margin-top:6px}
  .join-rail>p{display:none}
  .join-steps{grid-auto-flow:column;grid-auto-columns:1fr;gap:6px}
  .join-steps li{flex-direction:column;gap:5px;text-align:center}
  .join-steps b{font-size:11px}
  .join-assure{display:none}
  .join-stage{padding:14px 14px 34px}
  .join-card{border-radius:24px;padding:20px 16px}
  .mode-grid{grid-template-columns:1fr}
  .skills-grid{grid-template-columns:1fr 1fr}
  .skills-scroll{max-height:none;overflow:visible}
}
@media(max-width:420px){.skills-grid{grid-template-columns:1fr}}
`;
