'use client';
import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { api, ServiceRequestDetail, ServiceOffer } from '@/lib/api';
import { C, alpha, Button } from '@/components/ui';
import { ScreenHeader, Screen, fa, SCREEN_CSS } from '@/components/ScreenKit';
import {
  StoreIcon, HomeIcon, CheckIcon, StarIcon, CalendarIcon, PinIcon, ClockIcon, SparklesIcon,
} from '@/components/icons';

/**
 * پیشنهادهای یک درخواست.
 *
 * The screen exists to make one comparison easy: who, how much, how soon. The
 * cheapest offer is marked because that is the comparison people come to make,
 * but it is marked rather than sorted-to-the-top-and-highlighted, because the
 * cheapest workshop is not automatically the right one.
 */
export default function RequestDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id as string;

  const [req, setReq] = useState<ServiceRequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState<ServiceOffer | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(() => {
    api.serviceRequests.get(id)
      .then(setReq)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!localStorage.getItem('vtoken')) { router.replace(`/login?next=/requests/${id}`); return; }
    load();
  }, [router, id, load]);

  async function accept(offer: ServiceOffer) {
    setBusy(offer.id); setError('');
    try {
      const res = await api.serviceRequests.accept(id, offer.id);
      setReq(res);
      setConfirm(null);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(''); }
  }

  async function cancelRequest() {
    setCancelling(true);
    try { await api.serviceRequests.cancel(id); load(); }
    catch (e) { setError((e as Error).message); }
    finally { setCancelling(false); }
  }

  const offers = req?.offers ?? [];
  const live = offers.filter((o) => o.status !== 'declined' && o.status !== 'withdrawn');
  const cheapest = live.length > 1 ? Math.min(...live.map((o) => o.price)) : null;
  const matched = req?.status === 'matched';

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar title="پیشنهادها" />
      <Screen>
        <ScreenHeader
          title={req ? (req.serviceName || req.serviceType) : 'درخواست'}
          subtitle={req ? (req.mode === 'on_site' ? 'در محل تو' : 'در تعمیرگاه') : undefined}
          back="/requests"
        />

        {error && <p className="rd-err" role="alert" style={{ color: C.statusExpired, background: alpha(C.statusExpired, 10) }}>{error}</p>}

        {matched && (
          <div className="rd-done" style={{ background: alpha(C.statusOk, 10), boxShadow: C.shadowSoft }}>
            <span style={{ background: alpha(C.statusOk, 15), color: C.statusOk }}><CheckIcon size={20} /></span>
            <div>
              <b style={{ color: C.textStrong }}>نوبتت ثبت شد</b>
              <p style={{ color: C.text2 }}>تعمیرگاه خبر دارد. جزئیات را در «نوبت‌ها» دنبال کن.</p>
            </div>
            <Button size="sm" onClick={() => router.push('/appointments')}>نوبت‌ها</Button>
          </div>
        )}

        {req?.notes && !matched && (
          <p className="rd-note" style={{ background: C.fill1, color: C.text2 }}>
            <SparklesIcon size={13} />{req.notes}
          </p>
        )}

        {loading ? (
          <div className="rd-list">{[0, 1].map((i) => <div key={i} className="rd-skel" style={{ background: C.fill2 }} />)}</div>
        ) : live.length === 0 ? (
          <div className="rd-wait" style={{ background: C.surfaceSolid, boxShadow: C.shadowSoft }}>
            <span style={{ background: alpha(C.blue, 11), color: C.blue }}><ClockIcon size={26} /></span>
            <b style={{ color: C.textStrong }}>هنوز پیشنهادی نرسیده</b>
            <p style={{ color: C.muted }}>
              درخواستت برای تعمیرگاه‌هایی که این خدمت را می‌دهند فرستاده شد. به‌محض اینکه کسی قیمت بدهد، همین‌جا و با اعلان خبرت می‌کنیم.
            </p>
            {req?.status === 'open' && (
              <Button variant="secondary" onClick={cancelRequest} loading={cancelling}>لغو درخواست</Button>
            )}
          </div>
        ) : (
          <>
            <p className="rd-count" style={{ color: C.muted }}>
              {fa(live.length)} پیشنهاد {cheapest != null && <span style={{ color: C.text2 }}>· کمترین {fa(cheapest)} تومان</span>}
            </p>
            <div className="rd-list">
              {live.map((o, i) => {
                const best = cheapest != null && o.price === cheapest;
                const won = o.status === 'accepted';
                const hue = won ? C.statusOk : best ? C.green : C.blue;
                return (
                  <div key={o.id} className="rd-card"
                    style={{ background: C.surfaceSolid, boxShadow: C.shadowSoft, ['--row-hue' as string]: hue, ['--i' as string]: String(Math.min(i, 9)) }}>
                    <span className="rd-rail" style={{ background: hue }} />
                    <div className="rd-top">
                      <span className="rd-ico" style={{ background: alpha(hue, 12), color: hue }}><StoreIcon size={20} /></span>
                      <div className="rd-who">
                        <b style={{ color: C.textStrong }}>{o.workshop?.name || 'تعمیرگاه'}</b>
                        {o.workshop?.address && <small style={{ color: C.muted }}><PinIcon size={11} />{o.workshop.address}</small>}
                      </div>
                      {won ? (
                        <em style={{ color: C.statusOk, background: alpha(C.statusOk, 12) }}><CheckIcon size={11} />انتخاب شد</em>
                      ) : best && (
                        <em style={{ color: C.green, background: alpha(C.green, 12) }}><StarIcon size={11} />کمترین قیمت</em>
                      )}
                    </div>

                    <div className="rd-price">
                      <b style={{ color: C.textStrong }}>{fa(o.price)} <i style={{ color: C.muted }}>تومان</i></b>
                      {o.availability && (
                        <span style={{ color: C.text2, background: C.fill2 }}><CalendarIcon size={12} />{o.availability}</span>
                      )}
                    </div>

                    {o.message && <p className="rd-msg" style={{ color: C.text2, background: C.fill1 }}>{o.message}</p>}

                    {!matched && (
                      <Button fullWidth onClick={() => setConfirm(o)} loading={busy === o.id}>
                        انتخاب این تعمیرگاه
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
            {req?.status === 'open' && (
              <button type="button" onClick={cancelRequest} className="rd-cancel" style={{ color: C.muted }}>
                {cancelling ? 'در حال لغو...' : 'لغو این درخواست'}
              </button>
            )}
          </>
        )}
      </Screen>

      {/* Accepting books an appointment and closes every other offer, so it asks
          first. Written here rather than pulled from a shared dialog because
          this app has no confirm component. */}
      {confirm && (
        <div className="rd-veil" role="dialog" aria-modal="true" aria-label="تایید انتخاب تعمیرگاه"
          onClick={(e) => { if (e.target === e.currentTarget) setConfirm(null); }}>
          <div className="rd-sheet" style={{ background: C.surfaceSolid, boxShadow: C.shadowSheet }}>
            <b style={{ color: C.textStrong }}>همین تعمیرگاه؟</b>
            <p style={{ color: C.text2 }}>
              با انتخاب «{confirm.workshop?.name || 'این تعمیرگاه'}» نوبت ثبت می‌شود و بقیه‌ی پیشنهادها بسته می‌شوند.
            </p>
            <div className="rd-sheet-actions">
              <Button variant="secondary" fullWidth onClick={() => setConfirm(null)}>برگرد</Button>
              <Button fullWidth onClick={() => accept(confirm)} loading={busy === confirm.id}>بله، نوبت بگیر</Button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{SCREEN_CSS}</style>
      <style jsx>{`
        .rd-err{margin:0 0 12px;font-size:12.5px;font-weight:800;padding:11px 13px;border-radius:12px;line-height:1.8}
        .rd-done{display:flex;align-items:center;gap:11px;border-radius:19px;padding:14px;margin-bottom:14px}
        .rd-done>span{width:42px;height:42px;border-radius:14px;display:grid;place-items:center;flex-shrink:0}
        .rd-done div{flex:1;min-width:0}
        .rd-done b{display:block;font-size:14px;font-weight:900}
        .rd-done p{margin:3px 0 0;font-size:11.5px;line-height:1.7}
        .rd-note{display:flex;align-items:flex-start;gap:7px;margin:0 0 14px;font-size:12.5px;line-height:1.9;
                 padding:12px 14px;border-radius:14px}
        .rd-count{margin:0 2px 10px;font-size:12.5px;font-weight:800}
        .rd-list{display:grid;gap:11px}
        .rd-skel{height:150px;border-radius:20px;animation:rdPulse 1.4s ease-in-out infinite}
        @keyframes rdPulse{0%,100%{opacity:1}50%{opacity:.55}}
        .rd-card{position:relative;border-radius:20px;padding:15px 15px 15px 13px;overflow:hidden;display:grid;gap:12px;
                 animation:rdIn var(--dur-enter,460ms) var(--ease-spring,ease) backwards;animation-delay:calc(var(--i,0) * 55ms)}
        @keyframes rdIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
        .rd-rail{position:absolute;inset-inline-start:0;top:0;bottom:0;width:4px;border-start-end-radius:4px;border-end-end-radius:4px}
        .rd-top{display:flex;align-items:center;gap:11px}
        .rd-ico{width:42px;height:42px;border-radius:14px;display:grid;place-items:center;flex-shrink:0}
        .rd-who{flex:1;min-width:0}
        .rd-who b{display:block;font-size:14.5px;font-weight:900;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .rd-who small{display:flex;align-items:center;gap:4px;font-size:11px;margin-top:3px;line-height:1.6}
        .rd-top em{flex-shrink:0;font-style:normal;font-size:10px;font-weight:900;border-radius:999px;padding:5px 9px;
                   display:inline-flex;align-items:center;gap:3px}
        .rd-price{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
        .rd-price b{font-size:19px;font-weight:950;font-variant-numeric:tabular-nums}
        .rd-price b i{font-style:normal;font-size:12px;font-weight:700}
        .rd-price span{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;font-weight:800;
                       border-radius:10px;padding:6px 10px}
        .rd-msg{margin:0;font-size:12.5px;line-height:1.95;padding:11px 13px;border-radius:13px}
        .rd-wait{border-radius:22px;padding:32px 20px;text-align:center;display:grid;justify-items:center;gap:10px}
        .rd-wait>span{width:56px;height:56px;border-radius:18px;display:grid;place-items:center}
        .rd-wait b{font-size:15px;font-weight:900}
        .rd-wait p{margin:0 0 6px;font-size:12.5px;line-height:2;max-width:38ch}
        .rd-cancel{display:block;width:100%;margin-top:18px;border:0;background:transparent;cursor:pointer;
                   font:800 12.5px var(--font-sans);text-align:center}
        .rd-veil{position:fixed;inset:0;z-index:60;display:grid;align-items:end;justify-items:center;
                 background:rgba(12,10,40,.42);backdrop-filter:blur(3px);padding:14px;
                 animation:rdVeil .22s ease both}
        @keyframes rdVeil{from{opacity:0}to{opacity:1}}
        .rd-sheet{width:100%;max-width:420px;border-radius:24px;padding:22px 18px 18px;
                  animation:rdSheet .36s var(--ease-spring,cubic-bezier(.34,1.16,.64,1)) both}
        @keyframes rdSheet{from{transform:translateY(24px);opacity:0}to{transform:none;opacity:1}}
        .rd-sheet b{display:block;font-size:16.5px;font-weight:950;margin-bottom:8px}
        .rd-sheet p{margin:0 0 18px;font-size:13px;line-height:2}
        .rd-sheet-actions{display:grid;grid-template-columns:1fr 1.3fr;gap:9px}
        @media (min-width:520px){.rd-veil{align-items:center}}
        @media (prefers-reduced-motion: reduce){.rd-card,.rd-veil,.rd-sheet{animation:none}}
      `}</style>
    </div>
  );
}
