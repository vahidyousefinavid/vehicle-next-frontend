'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ServiceArt from '@/components/ServiceArt';
import PersianDatePicker from '@/components/PersianDatePicker';
import AddressLocationField, { type Coords } from '@/components/AddressLocationField';
import { api, PresetService, ServiceMode, Vehicle, Workshop } from '@/lib/api';
import { C, alpha, Button, Select, Spinner, TextArea } from '@/components/ui';
import {
  CarIcon, CheckIcon, ChevronRightIcon, NavigationIcon, PinIcon,
  StarIcon, StoreIcon, CalendarIcon, WalletIcon,
 SparklesIcon, SearchIcon, XIcon, PlusIcon,} from '@/components/icons';

/**
 * The order screen from the reference template, mapped onto this product.
 *
 * The template's flow is: pick a service, tick the line items you want with a
 * quantity each, watch a running total, then set where, when and with whom —
 * and one button at the bottom the whole time. That is what this is. The lines
 * are catalogue services in the same category, so a customer booking an oil
 * change can add the filter in the same visit instead of starting again.
 */

interface Line { key: string; qty: number }

export default function OrderPage() {
  const { key } = useParams<{ key: string }>();
  const router = useRouter();

  const [services, setServices] = useState<PresetService[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  const [lines, setLines] = useState<Line[]>([]);
  const [vehicleId, setVehicleId] = useState('');
  const [mode, setMode] = useState<ServiceMode>('in_shop');
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState<Coords | null>(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('10:00');
  const [notes, setNotes] = useState('');

  const [providers, setProviders] = useState<Workshop[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [mechanicId, setMechanicId] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<{ count: number; workshop: string } | null>(null);

  const decoded = decodeURIComponent(key || '');

  useEffect(() => {
    if (!localStorage.getItem('vtoken')) { router.replace('/'); return; }
    Promise.all([api.catalog.publicServices(), api.vehicles.list()])
      .then(([cat, cars]) => {
        setServices(cat.items);
        setVehicles(cars);
        if (cars.length) setVehicleId(cars[0].id);
        if (cat.items.some((s) => s.key === decoded)) setLines([{ key: decoded, qty: 1 }]);
      })
      .catch(() => setError('اطلاعات بارگذاری نشد'))
      .finally(() => setLoading(false));
  }, [decoded, router]);

  const main = services.find((s) => s.key === decoded);
  /** The chosen service first, then the rest of its category as add-ons. */
  /**
   * What can go into this order.
   *
   * It used to be the chosen service plus the rest of *its category*, which
   * meant that from a تعمیر ترمز order — a «تعمیرات» service — تعویض روغن was
   * not on the page at all, because it lives under «سرویس دوره‌ای». So an
   * order that found no workshop could not be changed into one that would; the
   * only way out was to go back and start again. Everything is reachable now:
   * the obvious add-ons stay up top, the rest is one tap away.
   */
  const menu = useMemo(() => {
    if (!main) return [];
    const siblings = services.filter((s) => s.category === main.category && s.key !== main.key);
    /* A line picked from another category has to stay visible, or it could be
       added and then never removed. */
    const strays = services.filter(
      (s) => s.category !== main.category && lines.some((l) => l.key === s.key),
    );
    return [main, ...siblings, ...strays];
  }, [services, main, lines]);

  const [showMore, setShowMore] = useState(false);
  const [menuQuery, setMenuQuery] = useState('');

  /** Everything not already on the list above. */
  const more = useMemo(() => {
    const shown = new Set(menu.map((s) => s.key));
    const needle = menuQuery.trim();
    return services.filter((s) => {
      if (shown.has(s.key)) return false;
      if (!needle) return true;
      return `${s.customName ?? ''} ${s.serviceType} ${s.category}`.includes(needle);
    });
  }, [services, menu, menuQuery]);

  const qtyOf = (k: string) => lines.find((l) => l.key === k)?.qty ?? 0;
  function setQty(k: string, next: number) {
    setLines((prev) => {
      const without = prev.filter((l) => l.key !== k);
      return next <= 0 ? without : [...without, { key: k, qty: Math.min(next, 9) }];
    });
  }

  const total = lines.reduce((sum, l) => {
    const s = services.find((x) => x.key === l.key);
    return sum + (s?.suggestedPrice ?? 0) * l.qty;
  }, 0);


  /**
   * The services this order is actually for.
   *
   * The search used to ask only for `main.serviceType` — the service in the
   * URL — so adding تعویض روغن to an order that started as تعمیر ترمز changed
   * nothing: the query still asked who does brakes, found nobody, and the list
   * stayed empty even though a workshop for the oil change existed. It is the
   * chosen line items that decide who can do the job.
   */
  const selectedTypes = useMemo(() => {
    const types = lines
      .map((l) => services.find((s) => s.key === l.key)?.serviceType)
      .filter((t): t is string => !!t);
    return [...new Set(types)];
  }, [lines, services]);

  /* A stable description of what was last asked for, so the effect below can
     tell a real change from a re-render. */
  const searchKey = `${selectedTypes.slice().sort().join('|')}::${mode}::${coords?.lat ?? ''},${coords?.lng ?? ''}`;
  const lastSearch = useRef('');

  const search = useCallback(async () => {
    if (!selectedTypes.length) { setProviders(null); return; }
    setSearching(true); setError(''); setMechanicId('');
    try {
      const list = await api.workshops.search({
        serviceTypes: selectedTypes, mode,
        lat: coords?.lat, lng: coords?.lng,
      });
      setProviders(list);
    } catch (e: any) { setError(e.message); }
    finally { setSearching(false); }
  }, [selectedTypes, mode, coords]);

  /* Re-run whenever the order changes — which is the whole fix. It is
     debounced because the quantity steppers fire in bursts, and keyed so that
     an unchanged order never searches twice. */
  useEffect(() => {
    if (!selectedTypes.length || lastSearch.current === searchKey) return;
    const t = setTimeout(() => { lastSearch.current = searchKey; search(); }, 320);
    return () => clearTimeout(t);
  }, [searchKey, selectedTypes.length, search]);

  async function submit() {
    if (!mechanicId || !date) { setError('تعمیرگاه و تاریخ را انتخاب کن'); return; }
    setSubmitting(true); setError('');
    try {
      const chosen = lines.filter((l) => l.qty > 0);
      const summary = chosen.map((l) => {
        const s = services.find((x) => x.key === l.key);
        return `${s?.customName || s?.serviceType}${l.qty > 1 ? ` ×${l.qty}` : ''}`;
      }).join('، ');

      // A vehicle may only hold one open appointment with a given workshop, so
      // the whole order is one booking: the first line names it and the rest
      // ride along in the note. Splitting it per line would fail on the second
      // create and leave the first one stranded.
      const primary = services.find((x) => x.key === chosen[0].key);
      if (!primary) throw new Error('خدمت انتخاب‌شده پیدا نشد');

      await api.appointments.create({
        vehicleId,
        mechanicId,
        requestedAt: `${date}T${time}`,
        serviceType: primary.serviceType,
        mode,
        address: mode === 'on_site' ? address : undefined,
        lat: mode === 'on_site' ? coords?.lat : undefined,
        lng: mode === 'on_site' ? coords?.lng : undefined,
        notes: [
          `سفارش: ${summary}`,
          total ? `برآورد: ${total.toLocaleString('fa-IR')} تومان` : '',
          notes.trim(),
        ].filter(Boolean).join('\n') || undefined,
      });

      const shop = providers?.find((p) => p.id === mechanicId);
      setDone({ count: chosen.length, workshop: shop?.workshopName || 'تعمیرگاه' });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="order"><div className="order-wrap"><Spinner /></div><style>{ORDER_CSS}</style></div>;

  if (done) {
    return (
      <div className="order">
        <div className="order-wrap done-wrap">
          <div className="done" style={{ background: C.surfaceSolid, boxShadow: C.shadowHero }}>
            <span style={{ background: `linear-gradient(135deg, ${C.green}, ${C.greenDark})`, color: C.onAccent }}><CheckIcon size={30} /></span>
            <h1 style={{ color: C.textStrong }}>درخواستت ثبت شد</h1>
            <p style={{ color: C.text2 }}>
              {done.count.toLocaleString('fa-IR')} خدمت در یک نوبت برای «{done.workshop}» ثبت شد. به‌محض تایید، خبرت می‌کنیم.
            </p>
            <Button fullWidth size="lg" onClick={() => router.push('/appointments')}>پیگیری نوبت‌ها</Button>
            <Link href="/dashboard" style={{ color: C.muted }}>بازگشت به خانه</Link>
          </div>
        </div>
        <style>{ORDER_CSS}</style>
      </div>
    );
  }

  if (!main) {
    return (
      <div className="order"><div className="order-wrap">
        <p style={{ color: C.muted, textAlign: 'center', padding: '40px 0' }}>این خدمت پیدا نشد.</p>
        <Button fullWidth onClick={() => router.push('/dashboard')}>بازگشت</Button>
      </div><style>{ORDER_CSS}</style></div>
    );
  }

  // کارت‌های «به‌زودی» لینک ندارند، ولی آدرس مستقیم که هنوز کار می‌کند —
  // پس سفارش باید همین‌جا هم بسته باشد، نه فقط در ظاهر کارت.
  if (main.availableNow === false) {
    return (
      <div className="order"><div className="order-wrap">
        <div style={{ textAlign: 'center', padding: '32px 0 12px' }}>
          <b style={{ color: C.textStrong, fontSize: 17, display: 'block', marginBottom: 8 }}>
            {main.customName || main.serviceType}
          </b>
          <p style={{ color: C.muted, fontSize: 13.5, lineHeight: 2 }}>
            این خدمت هنوز فعال نشده و به‌زودی اضافه می‌شود.
            <br />فعلاً می‌توانی ترمز، دیاگ، باتری، سرویس روغن و چک قبل از سفر را سفارش بدهی.
          </p>
        </div>
        <Button fullWidth onClick={() => router.push('/dashboard')}>دیدن خدمات فعال</Button>
      </div><style>{ORDER_CSS}</style></div>
    );
  }

  return (
    <div className="order">
      <div className="order-wrap">
        {/* ── header ── */}
        <header className="order-top">
          <button type="button" onClick={() => router.back()} style={{ background: C.surfaceSolid, boxShadow: C.shadowSoft, color: C.text2 }}>
            <ChevronRightIcon size={17} />
          </button>
          <h1 style={{ color: C.textStrong }}>{main.customName || main.serviceType}</h1>
        </header>

        <div className="hero-art" style={{ background: C.surfaceSolid, boxShadow: C.shadowSoft }}>
          <ServiceArt serviceType={main.serviceType} name={main.customName} height={128} radius={16} iconSize={52} />
          <div>
            <b style={{ color: C.textStrong }}>{main.category}</b>
            <small style={{ color: C.muted }}>قیمت‌ها تقریبی‌اند؛ مبلغ نهایی را تعمیرگاه تایید می‌کند.</small>
          </div>
        </div>

        {/* ── line items with quantity ── */}
        <h2 className="sec" style={{ color: C.textStrong }}>خدمات این سفارش</h2>
        <div className="menu">
          {menu.map((s) => {
            const qty = qtyOf(s.key);
            return (
              <div key={s.key} className="line" style={{ background: C.surfaceSolid, boxShadow: qty ? `0 0 0 1.5px ${alpha(C.green, 45)}, ${C.shadowSoft}` : C.shadowSoft }}>
                <span className="line-art"><ServiceArt serviceType={s.serviceType} name={s.customName} height="100%" iconSize={26} bleed /></span>
                <div className="line-body">
                  <b style={{ color: C.textStrong }}>{s.customName || s.serviceType}</b>
                  <small style={{ color: C.muted }}>
                    {s.suggestedPrice ? `${s.suggestedPrice.toLocaleString('fa-IR')} تومان` : 'توافقی'}
                    {s.supportsOnSite ? ' · قابل ارائه در محل' : ''}
                  </small>
                </div>
                <div className="stepper" style={{ background: C.fill2, border: `1px solid ${C.border}` }}>
                  <button type="button" aria-label="کم کردن" onClick={() => setQty(s.key, qty - 1)} disabled={qty === 0} style={{ color: qty ? C.text : C.subtle }}>−</button>
                  <b style={{ color: qty ? C.green : C.subtle }}>{qty.toLocaleString('fa-IR')}</b>
                  <button type="button" aria-label="اضافه کردن" onClick={() => setQty(s.key, qty + 1)} style={{ color: C.green }}>+</button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Any service, not just this category's — the fix for an order that
            cannot be changed into one somebody can actually do. */}
        {showMore ? (
          <div className="more" style={{ background: C.surfaceSolid, boxShadow: C.shadowSoft }}>
            <div className="more-find" style={{ background: C.fill2 }}>
              <SearchIcon size={15} color={C.muted} />
              <input value={menuQuery} onChange={(e) => setMenuQuery(e.target.value)}
                placeholder="جستجوی خدمت..." aria-label="جستجوی خدمت" style={{ color: C.textStrong }} autoFocus />
              <button type="button" onClick={() => { setShowMore(false); setMenuQuery(''); }} aria-label="بستن" style={{ color: C.muted }}>
                <XIcon size={14} />
              </button>
            </div>
            {more.length === 0 ? (
              <p className="more-none" style={{ color: C.muted }}>خدمتی با این جستجو نیست.</p>
            ) : (
              <div className="more-list">
                {more.map((s) => (
                  <button key={s.key} type="button" onClick={() => { setQty(s.key, 1); setShowMore(false); setMenuQuery(''); }}
                    className="more-row">
                    <span className="more-ico"><ServiceArt serviceType={s.serviceType} name={s.customName} height={34} radius={11} iconSize={17} /></span>
                    <span className="more-txt">
                      <b style={{ color: C.textStrong }}>{s.customName || s.serviceType}</b>
                      <small style={{ color: C.subtle }}>
                        {s.category}
                        {s.suggestedPrice ? ` · ${s.suggestedPrice.toLocaleString('fa-IR')} تومان` : ''}
                      </small>
                    </span>
                    <i style={{ color: C.green }}>+</i>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <button type="button" onClick={() => setShowMore(true)} className="more-open"
            style={{ background: C.surfaceSolid, boxShadow: C.shadowSoft, color: C.green }}>
            <PlusIcon size={15} />افزودن خدمت از دسته‌های دیگر
          </button>
        )}

        {/* ── car ── */}
        <h2 className="sec" style={{ color: C.textStrong }}>خودرو</h2>
        {vehicles.length === 0 ? (
          <Link href="/vehicles/new" className="empty-line" style={{ background: alpha(C.green, 8), border: `1px solid ${alpha(C.green, 24)}`, color: C.green }}>
            <CarIcon size={16} /> اول یک خودرو ثبت کن
          </Link>
        ) : (
          <Select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>{v.make} {v.model} {v.plateNumber ? `· ${v.plateNumber}` : ''}</option>
            ))}
          </Select>
        )}

        {/* ── where ── */}
        <h2 className="sec" style={{ color: C.textStrong }}>محل ارائه خدمت</h2>
        <div className="modes">
          {([
            { v: 'in_shop' as const, t: 'در تعمیرگاه', d: 'ماشین را می‌بری', i: <StoreIcon size={21} /> },
            { v: 'on_site' as const, t: 'در محل من',   d: 'تعمیرکار می‌آید', i: <NavigationIcon size={21} /> },
          ]).map((m) => {
            const on = mode === m.v;
            return (
              <button key={m.v} type="button" onClick={() => { setMode(m.v); setProviders(null); }}
                className={`mode ${on ? 'on' : ''}`}
                style={{ background: on ? alpha(C.green, 10) : C.surfaceSolid, boxShadow: on ? `0 0 0 1.5px ${alpha(C.green, 50)}, ${C.shadowSoft}` : C.shadowSoft }}>
                <span style={{ color: on ? C.green : C.muted, background: on ? alpha(C.green, 12) : C.fill2 }}>{m.i}</span>
                <span className="mode-text">
                  <b style={{ color: C.textStrong }}>{m.t}</b>
                  <small style={{ color: C.muted }}>{m.d}</small>
                </span>
                {on && <i style={{ color: C.green }}><CheckIcon size={14} /></i>}
              </button>
            );
          })}
        </div>

        {mode === 'on_site' && (
          <>
            <div className="block" style={{ background: C.surfaceSolid, boxShadow: C.shadowSoft, marginTop: 12 }}>
              <span className="block-badge" style={{ background: alpha(C.green, 12), color: C.green }}>
                <PinIcon size={18} />
              </span>
              <div className="block-body">
                <b style={{ color: C.textStrong }}>محل خدمت</b>
                <span style={{ color: C.muted }}>{address.trim() || 'آدرس دقیق را وارد کن'}</span>
              </div>
            </div>
            <div className="field">
              <AddressLocationField address={address} onAddressChange={setAddress} coords={coords} onCoordsChange={setCoords} required />
            </div>
          </>
        )}

        {/* ── when ── */}
        <h2 className="sec" style={{ color: C.textStrong }}>زمان مراجعه</h2>
        <div className="block" style={{ background: C.surfaceSolid, boxShadow: C.shadowSoft }}>
          <span className="block-badge round" style={{ background: alpha(C.amber, 13), color: C.amber }}>
            <CalendarIcon size={18} />
          </span>
          <div className="block-body">
            <b style={{ color: C.textStrong }}>زمان مراجعه</b>
            <span style={{ color: C.muted }}>{date ? `${date} · ساعت ${time}` : 'روز و ساعت را انتخاب کن'}</span>
          </div>
        </div>
        <div className="when">
          <div className="when-date"><PersianDatePicker value={date} onChange={setDate} /></div>
          <div className="when-time" style={{ background: C.surfaceSolid }}>
            <CalendarIcon size={15} color={C.muted} />
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={{ color: C.textStrong }} />
          </div>
        </div>

        {/* ── who ── */}
        <h2 className="sec" style={{ color: C.textStrong }}>تعمیرگاه</h2>
        {providers === null ? (
          /* The list searches itself now, so this is only reached before any
             line is chosen — there is nothing to look for yet. */
          <p className="none" style={{ color: C.muted }}>
            {selectedTypes.length ? 'در حال گرفتن فهرست تعمیرگاه‌ها...' : 'اول یک خدمت به سفارش اضافه کن.'}
          </p>
        ) : searching ? <Spinner /> : providers.length === 0 ? (
          <div className="noshop" style={{ background: C.surfaceSolid, boxShadow: C.shadowSoft }}>
            <b style={{ color: C.textStrong }}>برای این ترکیب، تعمیرگاهی ثبت نشده</b>
            <p style={{ color: C.muted }}>
              می‌توانی قلمی را برداری یا اضافه کنی تا دوباره بگردیم — یا درخواستت را باز بگذاری تا تعمیرگاه‌ها خودشان قیمت بدهند.
            </p>
            <Button fullWidth onClick={() => router.push('/requests/new')} icon={<SparklesIcon size={15} />}>
              ثبت درخواست باز
            </Button>
          </div>
        ) : (
          <div className="shops">
            {providers.map((w) => {
              const on = mechanicId === w.id;
              return (
                <button key={w.id} type="button" onClick={() => setMechanicId(w.id)} className={`shop ${on ? 'on' : ''}`}
                  style={{ background: on ? alpha(C.green, 9) : C.surfaceSolid, boxShadow: on ? `0 0 0 1.5px ${alpha(C.green, 50)}, ${C.shadowSoft}` : C.shadowSoft }}>
                  <span style={{ background: alpha(C.green, 11), color: C.green }}><StoreIcon size={19} /></span>
                  <div>
                    <b style={{ color: C.textStrong }}>{w.workshopName || 'تعمیرگاه'}</b>
                    <small style={{ color: C.muted }}>
                      {w.workshopAddress || 'بدون آدرس'}
                      {w.distanceKm != null ? ` · ${w.distanceKm.toLocaleString('fa-IR', { maximumFractionDigits: 1 })} کیلومتر` : ''}
                    </small>
                  </div>
                  <span className="shop-right">
                    <em style={{ color: C.statusWarn }}>
                      <StarIcon size={13} /> {w.rating ? w.rating.toLocaleString('fa-IR', { maximumFractionDigits: 1 }) : '—'}
                    </em>
                    {selectedTypes.length > 1 && (() => {
                      const covered = selectedTypes.filter((t) => (w.serviceTypes ?? []).includes(t)).length;
                      const all = covered === selectedTypes.length;
                      return (
                        <i style={{ color: all ? C.statusOk : C.muted, background: alpha(all ? C.statusOk : C.muted, 11) }}>
                          {all ? 'همه‌ی خدمات' : `${covered.toLocaleString('fa-IR')} از ${selectedTypes.length.toLocaleString('fa-IR')}`}
                        </i>
                      );
                    })()}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* ── payment ── */}
        <h2 className="sec" style={{ color: C.textStrong }}>پرداخت</h2>
        <div className="block" style={{ background: C.surfaceSolid, boxShadow: C.shadowSoft }}>
          <span className="block-badge" style={{ background: alpha(C.statusOk, 12), color: C.statusOk }}>
            <WalletIcon size={18} />
          </span>
          <div className="block-body">
            <b style={{ color: C.textStrong }}>بعد از تایید فاکتور</b>
            <span style={{ color: C.muted }}>مبلغ بالا برآورد است؛ تعمیرگاه فاکتور نهایی را می‌فرستد و بعد پرداخت می‌کنی.</span>
          </div>
        </div>

        {/* ── note ── */}
        <h2 className="sec" style={{ color: C.textStrong }}>توضیح (اختیاری)</h2>
        <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="اگر نکته‌ای هست بنویس؛ مثلاً صدای غیرعادی یا زمان دلخواه." />

        {error && <div className="err" role="alert" style={{ color: C.statusExpired, background: alpha(C.statusExpired, 10), border: `1px solid ${alpha(C.statusExpired, 24)}` }}>{error}</div>}
      </div>

      {/* ── the running total, always in reach ── */}
      <div className="bar" style={{ background: C.tabbarBg, borderTop: `1px solid ${C.border}`, boxShadow: C.shadowTabbar }}>
        <div>
          <small style={{ color: C.muted }}>مبلغ تقریبی</small>
          <b style={{ color: C.textStrong }}>{total ? `${total.toLocaleString('fa-IR')} تومان` : '—'}</b>
        </div>
        <Button size="lg" onClick={submit} loading={submitting} disabled={!mechanicId || !date || lines.length === 0}>
          ثبت درخواست
        </Button>
      </div>

      <style>{ORDER_CSS}</style>
    </div>
  );
}

const ORDER_CSS = `
.more-open{width:100%;margin-top:9px;border:0;cursor:pointer;border-radius:16px;padding:14px;
           font:900 13px var(--font-sans);display:flex;align-items:center;justify-content:center;gap:7px;
           transition:transform var(--dur-press,120ms) var(--ease-soft,ease)}
.more-open:active{transform:scale(.985)}
.more{margin-top:9px;border-radius:18px;padding:11px;display:grid;gap:9px}
.more-find{display:flex;align-items:center;gap:8px;border-radius:13px;padding:10px 12px}
.more-find input{flex:1;min-width:0;border:0;outline:0;background:transparent;font:700 13px var(--font-sans)}
.more-find button{border:0;background:transparent;cursor:pointer;display:grid;place-items:center;flex-shrink:0}
.more-list{display:grid;gap:5px;max-height:290px;overflow-y:auto}
.more-row{display:flex;align-items:center;gap:10px;border:0;background:transparent;cursor:pointer;
          border-radius:13px;padding:7px;font-family:var(--font-sans);text-align:start;
          transition:background var(--dur-move,260ms) var(--ease-soft,ease)}
.more-row:active{background:var(--fill-1)}
@media (hover:hover){ .more-row:hover{background:var(--fill-1)} }
.more-ico{width:34px;height:34px;flex-shrink:0}
.more-txt{flex:1;min-width:0}
.more-txt b{display:block;font-size:13px;font-weight:800;line-height:1.4}
.more-txt small{display:block;font-size:10.5px;margin-top:2px}
.more-row i{font-style:normal;font-size:19px;font-weight:900;flex-shrink:0;padding:0 7px}
.more-none{margin:0;font-size:12.5px;text-align:center;padding:16px 0}

.noshop{border-radius:20px;padding:22px 18px;display:grid;gap:9px;justify-items:center;text-align:center}
.noshop b{font-size:14.5px;font-weight:900}
.noshop p{margin:0 0 6px;font-size:12.5px;line-height:1.95;max-width:38ch}
.shop-right{display:grid;justify-items:end;gap:5px;flex-shrink:0}
.shop-right i{font-style:normal;font-size:10px;font-weight:900;border-radius:999px;padding:4px 8px;white-space:nowrap}

.order{min-height:100vh;background:var(--bg-gradient)}
.order-wrap{max-width:640px;margin:0 auto;padding:14px 16px calc(104px + env(safe-area-inset-bottom))}
.done-wrap{min-height:100vh;display:grid;place-items:center}
.order-top{display:flex;align-items:center;gap:12px;margin-bottom:16px}
.order-top button{width:42px;height:42px;border-radius:15px;display:grid;place-items:center;cursor:pointer;flex-shrink:0}
.order-top h1{margin:0;font-size:20px;font-weight:950;letter-spacing:-.3px}
.hero-art{border-radius:20px;padding:12px;display:grid;gap:11px;margin-bottom:6px}
.hero-art b{font-size:13.5px;font-weight:900;display:block}
.hero-art small{font-size:11.5px;line-height:1.7;display:block;margin-top:4px}
.sec{font-size:15px;font-weight:950;margin:22px 2px 11px}
.menu{display:grid;gap:10px}
.line{display:flex;align-items:stretch;border-radius:18px;overflow:hidden;transition:box-shadow .18s ease}
.line-art{width:76px;flex-shrink:0;display:block}
.line-body{flex:1;min-width:0;padding:12px 13px;align-self:center}
.line-body b{font-size:13.5px;font-weight:900;display:block;line-height:1.5}
.line-body small{font-size:11px;display:block;margin-top:3px}
.stepper{display:flex;align-items:center;gap:2px;border-radius:11px;padding:4px;flex-shrink:0;align-self:center;margin-inline-end:12px}
.stepper button{width:30px;height:30px;border:0;background:transparent;border-radius:10px;cursor:pointer;font:900 17px var(--font-sans);line-height:1}
.stepper button:disabled{cursor:not-allowed}
.stepper b{min-width:22px;text-align:center;font-size:13.5px;font-weight:950}
.empty-line{display:flex;align-items:center;justify-content:center;gap:7px;border-radius:16px;padding:13px;font:800 12.5px var(--font-sans);text-decoration:none}
.modes{display:grid;grid-template-columns:1fr 1fr;gap:11px}
.mode{position:relative;border-radius:18px;padding:15px;text-align:right;cursor:pointer;font-family:var(--font-sans);display:flex;flex-direction:column;gap:4px;align-items:flex-start;transition:transform .16s ease;min-height:0}
.mode:active{transform:scale(.98)}
.mode>span{width:44px;height:44px;border-radius:15px;display:grid;place-items:center;margin-bottom:5px}
.mode-text{display:block;flex:1;min-width:0}
.mode b{font-size:14px;display:block}
.mode small{font-size:11.5px;display:block;margin-top:3px}
.mode i{position:absolute;top:14px;left:14px}
.field{margin-top:12px}
.block{display:flex;align-items:center;gap:12px;border-radius:18px;padding:14px 15px;margin-bottom:11px}
.block-badge{width:42px;height:42px;border-radius:13px;display:grid;place-items:center;flex-shrink:0}
.block-badge.round{border-radius:50%}
.block-body{flex:1;min-width:0}
.block-body b{display:block;font-size:14px;font-weight:900}
.block-body span{display:block;font-size:11.5px;line-height:1.6;margin-top:2px}
.when{display:grid;grid-template-columns:1fr 128px;gap:10px;align-items:start}
.when-time{display:flex;align-items:center;gap:7px;border-radius:13px;padding:11px 12px;height:46px}
.when-time input{flex:1;min-width:0;border:0;outline:0;background:transparent;font:800 13px var(--font-sans)}
.shops{display:grid;gap:10px}
.shop{display:flex;align-items:center;gap:11px;border-radius:18px;padding:12px;cursor:pointer;font-family:var(--font-sans);text-align:right;transition:box-shadow .18s ease}
.shop>span{width:42px;height:42px;border-radius:15px;display:grid;place-items:center;flex-shrink:0}
.shop>div{flex:1;min-width:0}
.shop b{font-size:13.5px;font-weight:900;display:block}
.shop small{font-size:11px;display:block;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.shop em{font-style:normal;display:flex;align-items:center;gap:3px;font-size:12px;font-weight:900;flex-shrink:0}
.none{font-size:12.5px;text-align:center;padding:18px 0}
.err{border-radius:14px;padding:11px 14px;font-size:12.5px;font-weight:800;margin-top:16px}
.bar{position:fixed;bottom:0;left:0;right:0;z-index:40;display:flex;align-items:center;justify-content:space-between;gap:14px;padding:12px 16px calc(12px + env(safe-area-inset-bottom));backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px)}
.bar small{font-size:11px;font-weight:800;display:block}
.bar b{font-size:16px;font-weight:950;display:block;margin-top:2px}
.done{border-radius:30px;padding:38px 26px;text-align:center;display:grid;justify-items:center;gap:12px;max-width:420px;width:100%}
.done>span{width:72px;height:72px;border-radius:26px;display:grid;place-items:center;margin-bottom:4px}
.done h1{font-size:23px;margin:0;font-weight:950}
.done p{font-size:13px;line-height:1.9;margin:0 0 8px}
.done a{font-size:12.5px;font-weight:800;text-decoration:none}
@media(max-width:420px){
.modes{grid-template-columns:1fr}
.mode{flex-direction:row;align-items:center;gap:12px;padding:13px 14px;padding-left:38px}
.mode>span:first-child{margin-bottom:0}
.when{grid-template-columns:1fr}
}
`;
