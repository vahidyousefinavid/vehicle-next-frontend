'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import { api, ServiceRequestSummary } from '@/lib/api';
import { C, alpha, Button, Input } from '@/components/ui';
import { ScreenHeader, Screen, fa, SCREEN_CSS } from '@/components/ScreenKit';
import { svcMeta } from '@/components/serviceMeta';
import {
  CarIcon, HomeIcon, StoreIcon, CheckIcon, ClockIcon, WalletIcon, SparklesIcon,
} from '@/components/icons';

/**
 * درخواست‌های باز — کار تازه‌ای که می‌توانی برداری.
 *
 * The feed a workshop opens to find work. It only lists requests for services
 * the workshop actually offers, except when it has listed none yet — a brand
 * new workshop seeing an empty screen never learns what the page is for.
 *
 * Bidding happens inline. Sending a price is the whole job of this screen, and
 * pushing it onto another route would put a navigation between a workshop and
 * the thing it came here to do.
 */
export default function MechanicRequestsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<ServiceRequestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState('');
  const [price, setPrice] = useState('');
  const [when, setWhen] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api.serviceRequests.open().then(setRows).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!localStorage.getItem('vtoken')) { router.replace('/login?next=/mechanic/requests'); return; }
    load();
  }, [router, load]);

  function openForm(r: ServiceRequestSummary) {
    setOpenId(r.id);
    setPrice(r.myOffer ? String(Math.round(r.myOffer.price)) : '');
    setWhen(r.myOffer?.availability ?? '');
    setMsg(r.myOffer?.message ?? '');
    setError('');
  }

  async function send(r: ServiceRequestSummary) {
    const value = Number(price.replace(/\D/g, ''));
    if (!value) { setError('قیمت را وارد کن'); return; }
    setBusy(true); setError('');
    try {
      await api.serviceRequests.offer(r.id, {
        price: value,
        availability: when.trim() || undefined,
        message: msg.trim() || undefined,
      });
      setOpenId('');
      load();
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  async function withdraw(r: ServiceRequestSummary) {
    setBusy(true);
    try { await api.serviceRequests.withdraw(r.id); setOpenId(''); load(); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar title="درخواست‌های باز" />
      <Screen dense>
        <ScreenHeader title="درخواست‌های باز" subtitle="مشتری‌هایی که دنبال همین خدماتی‌اند که تو می‌دهی" back="/mechanic" />

        {loading ? (
          <div className="mr-list">{[0, 1].map((i) => <div key={i} className="mr-skel" style={{ background: C.fill2 }} />)}</div>
        ) : rows.length === 0 ? (
          <div className="mr-empty" style={{ background: C.surfaceSolid, boxShadow: C.shadowSoft }}>
            <span style={{ background: alpha(C.green, 11), color: C.green }}><SparklesIcon size={26} /></span>
            <b style={{ color: C.textStrong }}>الان درخواست بازی نیست</b>
            <p style={{ color: C.muted }}>
              وقتی مشتری‌ای خدمتی بخواهد که تو ارائه می‌دهی، همین‌جا می‌بینی و با اعلان خبرت می‌کنیم. هرچه خدمات بیشتری ثبت کنی، درخواست بیشتری می‌بینی.
            </p>
            <Button variant="secondary" onClick={() => router.push('/mechanic/services')}>خدمات من</Button>
          </div>
        ) : (
          <div className="mr-list">
            {rows.map((r, i) => {
              const meta = svcMeta(r.serviceType, r.serviceName ?? undefined);
              const Icon = meta.icon;
              const mine = r.myOffer && r.myOffer.status !== 'withdrawn' ? r.myOffer : null;
              const editing = openId === r.id;
              const car = [r.vehicle?.make, r.vehicle?.model].filter(Boolean).join(' ');
              return (
                <div key={r.id} className="mr-card"
                  style={{ background: C.surfaceSolid, boxShadow: C.shadowSoft, ['--row-hue' as string]: meta.color, ['--i' as string]: String(Math.min(i, 9)) }}>
                  <span className="mr-rail" style={{ background: meta.color }} />

                  <div className="mr-top">
                    <span className="mr-ico" style={{ background: alpha(meta.color, 12), color: meta.color }}>
                      <Icon size={20} />
                    </span>
                    <div className="mr-who">
                      <b style={{ color: C.textStrong }}>{r.serviceName || r.serviceType}</b>
                      <small style={{ color: C.muted }}>
                        {car && <span><CarIcon size={11} />{car}</span>}
                        {r.mode === 'on_site'
                          ? <span style={{ color: C.green, fontWeight: 900 }}><HomeIcon size={11} />در محل مشتری</span>
                          : <span><StoreIcon size={11} />در تعمیرگاه</span>}
                      </small>
                    </div>
                    {mine ? (
                      <em style={{ color: C.green, background: alpha(C.green, 12) }}><CheckIcon size={11} />پیشنهاد دادی</em>
                    ) : (
                      <em style={{ color: C.blue, background: alpha(C.blue, 11) }}>{fa(r.offerCount ?? 0)} پیشنهاد</em>
                    )}
                  </div>

                  {r.address && <p className="mr-meta" style={{ color: C.text2 }}>{r.address}</p>}
                  {r.notes && <p className="mr-notes" style={{ color: C.text2, background: C.fill1 }}>{r.notes}</p>}
                  {r.budget ? (
                    <p className="mr-budget" style={{ color: C.muted }}>
                      <WalletIcon size={12} />بودجه‌ی مشتری حدود {fa(r.budget)} تومان
                    </p>
                  ) : null}

                  {mine && !editing && (
                    <div className="mr-mine" style={{ background: alpha(C.green, 9) }}>
                      <b style={{ color: C.textStrong }}>{fa(mine.price)} <i style={{ color: C.muted }}>تومان</i></b>
                      {mine.availability && <span style={{ color: C.text2 }}><ClockIcon size={12} />{mine.availability}</span>}
                    </div>
                  )}

                  {editing ? (
                    <div className="mr-form">
                      <Input value={price} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ''))}
                        placeholder="قیمت پیشنهادی (تومان)" aria-label="قیمت پیشنهادی"
                        inputMode="numeric" dir="ltr" style={{ textAlign: 'left' }} autoFocus />
                      <Input value={when} onChange={(e) => setWhen(e.target.value)}
                        placeholder="کی می‌توانی؟ مثلاً فردا عصر" aria-label="زمان" />
                      <Input value={msg} onChange={(e) => setMsg(e.target.value)}
                        placeholder="توضیح کوتاه (اختیاری)" aria-label="توضیح" />
                      {error && <p className="mr-err" role="alert" style={{ color: C.statusExpired, background: alpha(C.statusExpired, 10) }}>{error}</p>}
                      <div className="mr-actions">
                        <Button variant="secondary" onClick={() => setOpenId('')}>انصراف</Button>
                        <Button onClick={() => send(r)} loading={busy}>{mine ? 'به‌روزرسانی' : 'ارسال پیشنهاد'}</Button>
                      </div>
                      {mine && (
                        <button type="button" onClick={() => withdraw(r)} className="mr-withdraw" style={{ color: C.muted }}>
                          پس گرفتن پیشنهاد
                        </button>
                      )}
                    </div>
                  ) : (
                    <Button fullWidth variant={mine ? 'secondary' : 'primary'} onClick={() => openForm(r)}>
                      {mine ? 'ویرایش پیشنهاد' : 'قیمت بده'}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Screen>
      <BottomNav />

      <style jsx global>{SCREEN_CSS}</style>
      <style jsx>{`
        .mr-list{display:grid;gap:11px}
        .mr-skel{height:160px;border-radius:20px;animation:mrPulse 1.4s ease-in-out infinite}
        @keyframes mrPulse{0%,100%{opacity:1}50%{opacity:.55}}
        .mr-card{position:relative;border-radius:20px;padding:15px 15px 15px 13px;overflow:hidden;display:grid;gap:11px;
                 animation:mrIn var(--dur-enter,460ms) var(--ease-spring,ease) backwards;animation-delay:calc(var(--i,0) * 55ms)}
        @keyframes mrIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
        .mr-rail{position:absolute;inset-inline-start:0;top:0;bottom:0;width:4px;border-start-end-radius:4px;border-end-end-radius:4px}
        .mr-top{display:flex;align-items:center;gap:11px}
        .mr-ico{width:42px;height:42px;border-radius:14px;display:grid;place-items:center;flex-shrink:0}
        .mr-who{flex:1;min-width:0}
        .mr-who b{display:block;font-size:14.5px;font-weight:900;line-height:1.4}
        .mr-who small{display:flex;align-items:center;gap:9px;flex-wrap:wrap;font-size:11px;margin-top:4px}
        .mr-who small span{display:inline-flex;align-items:center;gap:4px}
        .mr-top em{flex-shrink:0;font-style:normal;font-size:10px;font-weight:900;border-radius:999px;padding:5px 9px;
                   display:inline-flex;align-items:center;gap:3px;font-variant-numeric:tabular-nums}
        .mr-meta{margin:0;font-size:12px;line-height:1.8}
        .mr-notes{margin:0;font-size:12.5px;line-height:1.95;padding:11px 13px;border-radius:13px}
        .mr-budget{display:flex;align-items:center;gap:5px;margin:0;font-size:11.5px;font-weight:800;font-variant-numeric:tabular-nums}
        .mr-mine{display:flex;align-items:center;justify-content:space-between;gap:10px;border-radius:14px;padding:11px 13px}
        .mr-mine b{font-size:17px;font-weight:950;font-variant-numeric:tabular-nums}
        .mr-mine b i{font-style:normal;font-size:11.5px;font-weight:700}
        .mr-mine span{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;font-weight:800}
        .mr-form{display:grid;gap:9px}
        .mr-actions{display:grid;grid-template-columns:1fr 1.4fr;gap:9px}
        .mr-err{margin:0;font-size:12px;font-weight:800;padding:10px 12px;border-radius:11px;line-height:1.8}
        .mr-withdraw{border:0;background:transparent;cursor:pointer;font:800 12px var(--font-sans);padding:4px}
        .mr-empty{border-radius:22px;padding:32px 20px;text-align:center;display:grid;justify-items:center;gap:10px}
        .mr-empty>span{width:56px;height:56px;border-radius:18px;display:grid;place-items:center}
        .mr-empty b{font-size:15px;font-weight:900}
        .mr-empty p{margin:0 0 6px;font-size:12.5px;line-height:2;max-width:38ch}
        @media (prefers-reduced-motion: reduce){.mr-card{animation:none}}
      `}</style>
    </div>
  );
}
