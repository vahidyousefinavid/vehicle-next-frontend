'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { api, PresetService, Vehicle } from '@/lib/api';
import { C, alpha, Button, Input } from '@/components/ui';
import { ScreenHeader, Screen, fa, SCREEN_CSS } from '@/components/ScreenKit';
import ServiceArt from '@/components/ServiceArt';
import { svcMeta } from '@/components/serviceMeta';
import { CarIcon, HomeIcon, StoreIcon, CheckIcon, SearchIcon } from '@/components/icons';

/**
 * ثبت درخواست باز.
 *
 * Three questions, in the order someone can answer them: what does the car
 * need, which car, and where. Everything else — a time, a budget, a note — is
 * optional, because making people fill those in before they know what the work
 * costs is what stops a request being sent at all.
 */
export default function NewRequestPage() {
  const router = useRouter();
  const [services, setServices] = useState<PresetService[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [q, setQ] = useState('');

  const [picked, setPicked] = useState<PresetService | null>(null);
  const [vehicleId, setVehicleId] = useState('');
  const [mode, setMode] = useState<'in_shop' | 'on_site'>('in_shop');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [budget, setBudget] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!localStorage.getItem('vtoken')) { router.replace('/login?next=/requests/new'); return; }
    api.catalog.publicServices().then((r) => setServices(r.items)).catch(() => {});
    api.vehicles.list().then((v) => {
      setVehicles(v);
      if (v.length === 1) setVehicleId(v[0].id);
    }).catch(() => {});
  }, [router]);

  const shown = useMemo(() => {
    const needle = q.trim();
    if (!needle) return services;
    return services.filter((s) => `${s.customName ?? ''} ${s.serviceType} ${s.category}`.includes(needle));
  }, [services, q]);

  const canSend = !!picked && !!vehicleId && (mode === 'in_shop' || address.trim().length > 2);

  async function send() {
    if (!picked || !vehicleId) return;
    setSaving(true); setError('');
    try {
      const res = await api.serviceRequests.create({
        vehicleId,
        serviceType: picked.serviceType,
        serviceKey: picked.key,
        serviceName: picked.customName || picked.serviceType,
        mode,
        address: mode === 'on_site' ? address.trim() : undefined,
        notes: notes.trim() || undefined,
        budget: budget ? Number(budget.replace(/\D/g, '')) : undefined,
      });
      router.push(`/requests/${res.id}`);
    } catch (err) { setError((err as Error).message); }
    finally { setSaving(false); }
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar title="درخواست تازه" />
      <Screen>
        <ScreenHeader title="چه کاری لازم داری؟" subtitle="تعمیرگاه‌هایی که این کار را می‌کنند برایت قیمت می‌دهند" back="/requests" />

        {/* ── ۱. خدمت ── */}
        <div className="nr-find" style={{ background: C.surfaceSolid, boxShadow: C.shadowSoft }}>
          <SearchIcon size={17} color={C.muted} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجوی خدمت..."
            aria-label="جستجوی خدمت" style={{ color: C.textStrong }} />
        </div>

        <div className="nr-grid">
          {shown.map((s) => {
            const on = picked?.key === s.key;
            const meta = svcMeta(s.serviceType, s.customName);
            return (
              <button key={s.key} type="button" onClick={() => setPicked(s)} aria-pressed={on}
                className={`nr-svc${on ? ' on' : ''}`}
                style={{
                  background: C.surfaceSolid,
                  boxShadow: on ? `inset 0 0 0 2px ${meta.color}, ${C.shadowSoft}` : C.shadowSoft,
                }}>
                <ServiceArt serviceType={s.serviceType} name={s.customName} height={62} iconSize={24} bleed plate />
                <span className="nr-svc-b">
                  <b style={{ color: C.brandInk }}>{s.customName || s.serviceType}</b>
                  {s.suggestedPrice > 0 && <small style={{ color: C.muted }}>حدود {fa(s.suggestedPrice)} تومان</small>}
                </span>
                {on && <i className="nr-tick" style={{ background: meta.color, color: C.onAccent }}><CheckIcon size={12} /></i>}
              </button>
            );
          })}
        </div>

        {/* ── ۲. خودرو ── */}
        <h2 className="nr-h" style={{ color: C.textStrong }}>کدام خودرو؟</h2>
        {vehicles.length === 0 ? (
          <p className="nr-note" style={{ background: alpha(C.statusWarn, 10), color: C.text2 }}>
            اول باید یک خودرو ثبت کنی.{' '}
            <button type="button" onClick={() => router.push('/vehicles/new')} style={{ color: C.green }}>افزودن خودرو</button>
          </p>
        ) : (
          <div className="nr-cars">
            {vehicles.map((v) => {
              const on = vehicleId === v.id;
              return (
                <button key={v.id} type="button" onClick={() => setVehicleId(v.id)} aria-pressed={on}
                  style={{
                    background: on ? alpha(C.green, 10) : C.surfaceSolid,
                    boxShadow: on ? `inset 0 0 0 1.5px ${alpha(C.green, 50)}` : C.shadowSoft,
                  }}>
                  <span style={{ background: alpha(on ? C.green : C.muted, 12), color: on ? C.green : C.muted }}><CarIcon size={17} /></span>
                  <span>
                    <b style={{ color: C.textStrong }}>{[v.make, v.model].filter(Boolean).join(' ') || 'خودرو'}</b>
                    {v.plateNumber && <small style={{ color: C.muted }} dir="ltr">{v.plateNumber}</small>}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* ── ۳. کجا ── */}
        <h2 className="nr-h" style={{ color: C.textStrong }}>کجا انجام شود؟</h2>
        <div className="nr-mode">
          {([['in_shop', 'در تعمیرگاه', <StoreIcon key="s" size={16} />], ['on_site', 'در محل من', <HomeIcon key="h" size={16} />]] as const).map(([k, label, icon]) => {
            const on = mode === k;
            return (
              <button key={k} type="button" onClick={() => setMode(k)} aria-pressed={on}
                style={{
                  background: on ? alpha(C.green, 11) : C.surfaceSolid,
                  color: on ? C.textStrong : C.text2,
                  boxShadow: on ? `inset 0 0 0 1.5px ${alpha(C.green, 50)}` : C.shadowSoft,
                }}>
                <span style={{ color: on ? C.green : C.muted }}>{icon}</span>{label}
              </button>
            );
          })}
        </div>
        {mode === 'on_site' && (
          <Input value={address} onChange={(e) => setAddress(e.target.value)}
            placeholder="آدرس یا محله‌ای که ماشین آنجاست" aria-label="آدرس" style={{ marginTop: 10 }} />
        )}

        {/* ── اختیاری ── */}
        <h2 className="nr-h" style={{ color: C.textStrong }}>توضیح بیشتر <small style={{ color: C.subtle }}>اختیاری</small></h2>
        <Input value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="مثلاً صدای ترمز از جلو می‌آید" aria-label="توضیح" />
        <Input value={budget} onChange={(e) => setBudget(e.target.value.replace(/\D/g, ''))}
          placeholder="بودجه‌ی تقریبی (تومان)" aria-label="بودجه" inputMode="numeric" dir="ltr"
          style={{ textAlign: 'left', marginTop: 10 }} />

        {error && <p className="nr-err" role="alert" style={{ color: C.statusExpired, background: alpha(C.statusExpired, 10) }}>{error}</p>}

        <div className="nr-send" style={{ background: C.surfaceSolid, boxShadow: C.shadowHero }}>
          <div>
            <b style={{ color: C.textStrong }}>{picked ? (picked.customName || picked.serviceType) : 'یک خدمت انتخاب کن'}</b>
            <small style={{ color: C.muted }}>
              {canSend ? 'برای تعمیرگاه‌های مرتبط فرستاده می‌شود' : 'خدمت، خودرو و محل را مشخص کن'}
            </small>
          </div>
          <Button size="lg" onClick={send} loading={saving} disabled={!canSend}>ارسال درخواست</Button>
        </div>
      </Screen>

      <style jsx global>{SCREEN_CSS}</style>
      <style jsx>{`
        .nr-find{display:flex;align-items:center;gap:9px;border-radius:15px;padding:12px 14px;margin-bottom:11px}
        .nr-find input{flex:1;min-width:0;border:0;outline:0;background:transparent;font:700 13.5px var(--font-sans)}
        .nr-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(146px,1fr));gap:9px}
        .nr-svc{position:relative;border:0;cursor:pointer;border-radius:17px;overflow:hidden;padding:0;text-align:start;
                font-family:var(--font-sans);display:flex;flex-direction:column;
                transition:box-shadow var(--dur-move,260ms) var(--ease-soft,ease),transform var(--dur-press,120ms) var(--ease-soft,ease)}
        .nr-svc:active{transform:scale(.97)}
        .nr-svc-b{padding:9px 11px 11px}
        .nr-svc-b b{display:block;font-size:12.5px;font-weight:800;line-height:1.45}
        .nr-svc-b small{display:block;font-size:10.5px;margin-top:3px;font-variant-numeric:tabular-nums}
        .nr-tick{position:absolute;top:7px;inset-inline-start:7px;width:20px;height:20px;border-radius:50%;
                 display:grid;place-items:center;font-style:normal}
        .nr-h{margin:22px 2px 10px;font-size:15px;font-weight:950;display:flex;align-items:baseline;gap:7px}
        .nr-h small{font-size:11px;font-weight:700}
        .nr-cars{display:grid;gap:8px}
        .nr-cars button{display:flex;align-items:center;gap:10px;border:0;cursor:pointer;border-radius:15px;padding:12px;
                        font-family:var(--font-sans);text-align:start;
                        transition:box-shadow var(--dur-move,260ms) var(--ease-soft,ease),background var(--dur-move,260ms) var(--ease-soft,ease)}
        .nr-cars button>span:first-child{width:36px;height:36px;border-radius:12px;display:grid;place-items:center;flex-shrink:0}
        .nr-cars b{display:block;font-size:13.5px;font-weight:900}
        .nr-cars small{display:block;font-size:11px;margin-top:2px}
        .nr-mode{display:grid;grid-template-columns:1fr 1fr;gap:8px}
        .nr-mode button{display:flex;align-items:center;justify-content:center;gap:7px;border:0;cursor:pointer;
                        border-radius:15px;padding:14px;font:900 13px var(--font-sans);
                        transition:box-shadow var(--dur-move,260ms) var(--ease-soft,ease),background var(--dur-move,260ms) var(--ease-soft,ease)}
        .nr-note{margin:0;font-size:12.5px;line-height:1.95;padding:12px 14px;border-radius:14px}
        .nr-note button{border:0;background:transparent;cursor:pointer;font:900 12.5px var(--font-sans)}
        .nr-err{margin:14px 0 0;font-size:12.5px;font-weight:800;padding:11px 13px;border-radius:12px;line-height:1.8}
        .nr-send{position:sticky;bottom:calc(12px + env(safe-area-inset-bottom));margin-top:22px;border-radius:20px;
                 padding:13px 14px;display:flex;align-items:center;gap:12px}
        .nr-send div{flex:1;min-width:0}
        .nr-send b{display:block;font-size:13.5px;font-weight:900;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .nr-send small{display:block;font-size:11px;margin-top:3px;line-height:1.6}
        @media (prefers-reduced-motion: reduce){.nr-svc:active{transform:none}}
      `}</style>
    </div>
  );
}
