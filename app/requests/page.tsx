'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import { api, ServiceRequestSummary } from '@/lib/api';
import { C, alpha, Button } from '@/components/ui';
import { ScreenHeader, Screen, fa, money, SCREEN_CSS } from '@/components/ScreenKit';
import { SparklesIcon, PlusIcon, ChevronLeftIcon, HomeIcon, StoreIcon, CheckIcon } from '@/components/icons';

/**
 * درخواست‌های من.
 *
 * The other way to get a service: instead of hunting for a workshop that does
 * the job, describe the job once and let workshops answer with a price. The
 * count of offers is the whole point of the row, so it is the loudest thing on
 * it.
 */

const STATE: Record<string, { label: string; hue: string }> = {
  open:      { label: 'باز — منتظر پیشنهاد', hue: 'var(--blue)' },
  matched:   { label: 'نوبت ثبت شد',          hue: 'var(--status-ok)' },
  cancelled: { label: 'لغو شده',              hue: 'var(--subtle)' },
  expired:   { label: 'منقضی',                hue: 'var(--subtle)' },
};

export default function RequestsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<ServiceRequestSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem('vtoken')) { router.replace('/login?next=/requests'); return; }
    api.serviceRequests.mine().then(setRows).catch(() => {}).finally(() => setLoading(false));
  }, [router]);

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar title="درخواست‌های من" />
      <Screen>
        <ScreenHeader
          title="درخواست‌های من"
          subtitle="بگو چه می‌خواهی، تعمیرگاه‌ها قیمت می‌دهند"
          back="/dashboard"
          action={<Button size="sm" onClick={() => router.push('/requests/new')} icon={<PlusIcon size={14} />}>درخواست تازه</Button>}
        />

        {loading ? (
          <div className="rq-list">{[0, 1].map((i) => <div key={i} className="rq-skel" style={{ background: C.fill2 }} />)}</div>
        ) : rows.length === 0 ? (
          <div className="rq-empty" style={{ background: C.surfaceSolid, boxShadow: C.shadowSoft }}>
            <span style={{ background: alpha(C.green, 11), color: C.green }}><SparklesIcon size={26} /></span>
            <b style={{ color: C.textStrong }}>هنوز درخواستی نداده‌ای</b>
            <p style={{ color: C.muted }}>
              لازم نیست خودت دنبال تعمیرگاه بگردی. بنویس ماشینت چه می‌خواهد، تعمیرگاه‌هایی که آن کار را می‌کنند قیمت و زمان می‌دهند و تو انتخاب می‌کنی.
            </p>
            <Button size="lg" onClick={() => router.push('/requests/new')} icon={<PlusIcon size={15} />}>اولین درخواست</Button>
          </div>
        ) : (
          <div className="rq-list">
            {rows.map((r, i) => {
              const st = STATE[r.status] ?? STATE.open;
              const count = r.offerCount ?? 0;
              return (
                <Link key={r.id} href={`/requests/${r.id}`} className="rq-row"
                  style={{ background: C.surfaceSolid, boxShadow: C.shadowSoft, ['--row-hue' as string]: st.hue, ['--i' as string]: String(Math.min(i, 9)) }}>
                  <span className="rq-rail" style={{ background: st.hue }} />
                  <span className="rq-body">
                    <b style={{ color: C.textStrong }}>{r.serviceName || r.serviceType}</b>
                    <small style={{ color: C.muted }}>
                      <span style={{ color: st.hue, fontWeight: 900 }}>{st.label}</span>
                      {r.mode === 'on_site'
                        ? <span><HomeIcon size={11} />در محل</span>
                        : <span><StoreIcon size={11} />در تعمیرگاه</span>}
                    </small>
                  </span>
                  <span className="rq-count">
                    {r.status === 'matched' ? (
                      <i style={{ background: alpha(C.statusOk, 12), color: C.statusOk }}><CheckIcon size={15} /></i>
                    ) : (
                      <b style={{
                        color: count ? C.onAccent : C.muted,
                        background: count ? `linear-gradient(135deg, ${C.green}, ${C.greenDark})` : C.fill2,
                        boxShadow: count ? C.shadowBrand : 'none',
                      }}>{fa(count)}</b>
                    )}
                    <small style={{ color: C.subtle }}>{r.status === 'matched' ? 'نهایی' : 'پیشنهاد'}</small>
                  </span>
                  <ChevronLeftIcon size={16} color={C.subtle} />
                </Link>
              );
            })}
          </div>
        )}
      </Screen>
      <BottomNav />

      <style jsx global>{SCREEN_CSS}</style>
      <style jsx>{`
        .rq-list{display:grid;gap:9px}
        .rq-skel{height:78px;border-radius:19px;animation:rqPulse 1.4s ease-in-out infinite}
        @keyframes rqPulse{0%,100%{opacity:1}50%{opacity:.55}}
        :global(.rq-row){position:relative;display:flex;align-items:center;gap:12px;border-radius:19px;padding:14px 14px 14px 12px;
                overflow:hidden;text-decoration:none;
                transition:transform var(--dur-move,260ms) var(--ease-soft,ease),box-shadow var(--dur-move,260ms) var(--ease-soft,ease);
                animation:rqIn var(--dur-enter,460ms) var(--ease-spring,ease) backwards;animation-delay:calc(var(--i,0) * 45ms)}
        @keyframes rqIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
        @media (hover:hover){:global(.rq-row:hover){transform:translateY(-3px);
          box-shadow:0 16px 30px -15px color-mix(in srgb, var(--row-hue, var(--brand)) 50%, transparent), var(--shadow-soft)}}
        :global(.rq-row:active){transform:scale(.985);transition-duration:var(--dur-press,120ms)}
        .rq-rail{position:absolute;inset-inline-start:0;top:0;bottom:0;width:4px;border-start-end-radius:4px;border-end-end-radius:4px}
        .rq-body{flex:1;min-width:0}
        .rq-body b{display:block;font-size:14.5px;font-weight:900;line-height:1.45;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .rq-body small{display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:11.5px;margin-top:4px}
        .rq-body small span{display:inline-flex;align-items:center;gap:4px}
        .rq-count{flex-shrink:0;display:grid;justify-items:center;gap:3px}
        .rq-count b,.rq-count i{width:38px;height:38px;border-radius:13px;display:grid;place-items:center;
                                font-size:15px;font-weight:950;font-variant-numeric:tabular-nums;font-style:normal}
        .rq-count small{font-size:9.5px;font-weight:800}
        .rq-empty{border-radius:22px;padding:32px 20px;text-align:center;display:grid;justify-items:center;gap:10px}
        .rq-empty>span{width:56px;height:56px;border-radius:18px;display:grid;place-items:center}
        .rq-empty b{font-size:15.5px;font-weight:900}
        .rq-empty p{margin:0 0 8px;font-size:12.5px;line-height:2;max-width:38ch}
        @media (prefers-reduced-motion: reduce){:global(.rq-row),:global(.rq-row:hover),:global(.rq-row:active){transform:none;animation:none}}
      `}</style>
    </div>
  );
}
