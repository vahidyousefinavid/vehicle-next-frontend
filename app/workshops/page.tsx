'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import { api, Workshop } from '@/lib/api';
import { C, alpha, Button } from '@/components/ui';
import { fa } from '@/components/ScreenKit';
import {
  CompassIcon, StoreIcon, StarIcon, PinIcon, SearchIcon, HomeIcon, ChevronLeftIcon, XIcon,
} from '@/components/icons';

/**
 * Finding a workshop.
 *
 * Three things were wrong here. The page required a token, so a visitor who
 * came from a landing page promising "see the workshops near you" was bounced
 * to sign-up before seeing one. The filter chips were the twelve hardcoded
 * service types rather than what workshops actually offer, so most of them
 * returned nothing — and the eight catalogue services typed «سایر» could not
 * be filtered for at all. And a card showed a name, a star and an address,
 * which never answers the only question being asked: can they do my job?
 */

type Sort = 'near' | 'rating';

export default function WorkshopsPage() {
  const router = useRouter();
  const [list, setList] = useState<Workshop[]>([]);
  const [q, setQ] = useState('');
  const [service, setService] = useState<string | null>(null);
  const [onSiteOnly, setOnSiteOnly] = useState(false);
  const [sort, setSort] = useState<Sort>('near');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => { setSignedIn(!!localStorage.getItem('vtoken')); }, []);

  const load = useCallback((c?: { lat: number; lng: number } | null) => {
    setLoading(true);
    api.workshops.publicSearch({ lat: c?.lat, lng: c?.lng })
      .then(setList)
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(coords); }, [load, coords]);

  function locate() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocating(false); },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  /* Chips are built from what these workshops genuinely offer. A filter that
     can only ever return nothing is worse than no filter. */
  const offered = useMemo(() => {
    const count = new Map<string, number>();
    list.forEach((w) => (w.serviceNames ?? []).forEach((n) => count.set(n, (count.get(n) ?? 0) + 1)));
    return [...count.entries()].sort((a, b) => b[1] - a[1]);
  }, [list]);

  const shown = useMemo(() => {
    const needle = q.trim();
    const rows = list.filter((w) => {
      if (onSiteOnly && !w.onSite) return false;
      if (service && !(w.serviceNames ?? []).includes(service)) return false;
      if (!needle) return true;
      return `${w.workshopName ?? ''} ${w.workshopAddress ?? ''} ${(w.serviceNames ?? []).join(' ')}`.includes(needle);
    });
    return [...rows].sort((a, b) => {
      if (sort === 'rating') return b.rating - a.rating || (a.distanceKm ?? 1e9) - (b.distanceKm ?? 1e9);
      const da = a.distanceKm ?? 1e9, db = b.distanceKm ?? 1e9;
      return da - db || b.rating - a.rating;
    });
  }, [list, q, service, onSiteOnly, sort]);

  const filtering = !!service || onSiteOnly || !!q.trim();
  const clearAll = () => { setService(null); setOnSiteOnly(false); setQ(''); };

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar title="پیدا کردن تعمیرگاه" />
      <main className="ws">
        {/* ── find ── */}
        <div className="ws-find" style={{ background: C.surfaceSolid, boxShadow: C.shadowSoft }}>
          <SearchIcon size={18} color={C.muted} />
          <input value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="نام تعمیرگاه، محله یا خدمت..." aria-label="جستجوی تعمیرگاه"
            style={{ color: C.textStrong }} />
          {q && (
            <button type="button" onClick={() => setQ('')} aria-label="پاک کردن جستجو"
              style={{ color: C.muted, background: C.fill2 }}><XIcon size={13} /></button>
          )}
        </div>

        <div className="ws-tools">
          <button type="button" onClick={locate} disabled={locating}
            className={`ws-chip${coords ? ' on' : ''}`}
            style={coords
              ? { background: alpha(C.green, 12), color: C.green, boxShadow: `inset 0 0 0 1.5px ${alpha(C.green, 45)}` }
              : { background: C.surfaceSolid, color: C.text2, boxShadow: `inset 0 0 0 1px ${C.border}` }}>
            <CompassIcon size={14} />{locating ? 'در حال یافتن...' : coords ? 'نزدیک من' : 'نزدیک من'}
          </button>
          <button type="button" onClick={() => setOnSiteOnly((v) => !v)}
            className={`ws-chip${onSiteOnly ? ' on' : ''}`}
            style={onSiteOnly
              ? { background: alpha(C.green, 12), color: C.green, boxShadow: `inset 0 0 0 1.5px ${alpha(C.green, 45)}` }
              : { background: C.surfaceSolid, color: C.text2, boxShadow: `inset 0 0 0 1px ${C.border}` }}>
            <HomeIcon size={14} />در محل
          </button>
          <span className="ws-sort" style={{ background: C.fill2 }}>
            {([['near', 'نزدیک‌ترین'], ['rating', 'بهترین امتیاز']] as const).map(([k, label]) => (
              <button key={k} type="button" onClick={() => setSort(k)}
                style={{
                  background: sort === k ? C.surfaceSolid : 'transparent',
                  color: sort === k ? C.textStrong : C.muted,
                  boxShadow: sort === k ? C.shadowSoft : 'none',
                }}>{label}</button>
            ))}
          </span>
        </div>

        {offered.length > 0 && (
          <div className="ws-services">
            {offered.map(([name, n]) => {
              const on = service === name;
              return (
                <button key={name} type="button" onClick={() => setService(on ? null : name)} aria-pressed={on}
                  style={on
                    ? { background: C.green, color: C.onAccent, boxShadow: C.shadowBrand }
                    : { background: C.surfaceSolid, color: C.text2, boxShadow: `inset 0 0 0 1px ${C.border}` }}>
                  {name}<i style={{ color: on ? 'rgba(255,255,255,.72)' : C.subtle }}>{fa(n)}</i>
                </button>
              );
            })}
          </div>
        )}

        <p className="ws-count" style={{ color: C.muted }}>
          {loading ? 'در حال گرفتن فهرست...' : `${fa(shown.length)} تعمیرگاه`}
          {filtering && !loading && (
            <button type="button" onClick={clearAll} style={{ color: C.green }}>حذف فیلترها</button>
          )}
        </p>

        {loading ? (
          <div className="ws-list">{[0, 1, 2].map((i) => <div key={i} className="ws-skel" style={{ background: C.fill2 }} />)}</div>
        ) : shown.length === 0 ? (
          <div className="ws-empty" style={{ background: C.surfaceSolid, boxShadow: C.shadowSoft }}>
            <span style={{ background: alpha(C.green, 11), color: C.green }}><StoreIcon size={26} /></span>
            <b style={{ color: C.textStrong }}>
              {filtering ? 'با این فیلترها تعمیرگاهی نیست' : 'هنوز تعمیرگاهی ثبت نشده'}
            </b>
            <p style={{ color: C.muted }}>
              {filtering
                ? 'فیلترها را بردار تا همه‌ی تعمیرگاه‌ها را ببینی.'
                : 'شبکه‌ی ما تازه در حال شکل گرفتن است. اگر تعمیرگاه داری، همین‌جا ثبتش کن.'}
            </p>
            {filtering
              ? <Button onClick={clearAll}>نمایش همه</Button>
              : <Button onClick={() => router.push('/join/mechanic')}>ثبت تعمیرگاه</Button>}
          </div>
        ) : (
          <div className="ws-list">
            {shown.map((w, i) => {
              const fresh = w.reviewCount === 0;
              const svc = w.serviceNames ?? [];
              const href = signedIn ? `/workshops/${w.id}` : `/login?next=${encodeURIComponent(`/workshops/${w.id}`)}`;
              return (
                <Link key={w.id} href={href} className="ws-card"
                  style={{
                    background: C.surfaceSolid,
                    boxShadow: C.shadowSoft,
                    ['--row-hue' as string]: fresh ? C.blue : C.green,
                    ['--i' as string]: String(Math.min(i, 9)),
                  }}>
                  <span className="ws-rail" style={{ background: fresh ? C.blue : C.green }} />
                  <span className="ws-ico" style={{ background: alpha(fresh ? C.blue : C.green, 12), color: fresh ? C.blue : C.green }}>
                    <StoreIcon size={21} />
                  </span>
                  <span className="ws-body">
                    <span className="ws-head">
                      <b style={{ color: C.textStrong }}>{w.workshopName || 'تعمیرگاه'}</b>
                      {fresh ? (
                        <em style={{ color: C.blue, background: alpha(C.blue, 11) }}>تازه‌وارد</em>
                      ) : (
                        <em style={{ color: C.statusWarn, background: alpha(C.statusWarn, 12) }}>
                          <StarIcon size={11} />{fa(w.rating)} <i style={{ color: C.subtle }}>({fa(w.reviewCount)})</i>
                        </em>
                      )}
                    </span>

                    <small style={{ color: C.muted }}>
                      {w.distanceKm != null && (
                        <span style={{ color: C.text2, fontWeight: 800 }}>
                          <PinIcon size={11} />{fa(w.distanceKm)} کیلومتر
                        </span>
                      )}
                      {w.workshopAddress || (w.distanceKm == null ? 'آدرس ثبت نشده' : '')}
                    </small>

                    {svc.length > 0 && (
                      <span className="ws-pills">
                        {svc.slice(0, 3).map((n) => (
                          <i key={n} style={{ background: C.fill2, color: C.text2 }}>{n}</i>
                        ))}
                        {svc.length > 3 && <i style={{ background: C.fill2, color: C.subtle }}>+{fa(svc.length - 3)}</i>}
                      </span>
                    )}

                    {w.onSite && (
                      <span className="ws-onsite" style={{ color: C.green }}>
                        <HomeIcon size={12} />در محل تو هم خدمت می‌دهد
                      </span>
                    )}
                  </span>
                  <ChevronLeftIcon size={16} color={C.subtle} />
                </Link>
              );
            })}
          </div>
        )}

        {!signedIn && shown.length > 0 && (
          <p className="ws-hint" style={{ color: C.muted, background: C.fill1 }}>
            برای گرفتن نوبت باید وارد شوی — <Link href="/login" style={{ color: C.green, fontWeight: 900 }}>ورود یا ثبت‌نام</Link>
          </p>
        )}
      </main>
      {signedIn && <BottomNav />}

      <style jsx>{`
        .ws{max-width:620px;margin:0 auto;padding:14px 14px calc(96px + env(safe-area-inset-bottom))}
        .ws-find{display:flex;align-items:center;gap:10px;border-radius:17px;padding:13px 15px;margin-bottom:11px}
        .ws-find input{flex:1;min-width:0;border:0;outline:0;background:transparent;font:700 14px var(--font-sans);padding:2px 0}
        .ws-find button{border:0;cursor:pointer;width:24px;height:24px;border-radius:50%;display:grid;place-items:center;flex-shrink:0}
        .ws-tools{display:flex;align-items:center;gap:8px;margin-bottom:11px;overflow-x:auto;scrollbar-width:none;padding-bottom:2px}
        .ws-tools::-webkit-scrollbar{display:none}
        .ws-chip{flex-shrink:0;border:0;cursor:pointer;border-radius:13px;padding:10px 13px;font:800 12.5px var(--font-sans);
                 display:inline-flex;align-items:center;gap:6px;
                 transition:background var(--dur-move,260ms) var(--ease-soft,ease),box-shadow var(--dur-move,260ms) var(--ease-soft,ease),transform var(--dur-press,120ms) var(--ease-soft,ease)}
        .ws-chip:active{transform:scale(.96)}
        .ws-sort{flex-shrink:0;display:inline-flex;gap:3px;padding:3px;border-radius:13px;margin-inline-start:auto}
        .ws-sort button{border:0;cursor:pointer;border-radius:10px;padding:8px 11px;font:800 11.5px var(--font-sans);white-space:nowrap;
                        transition:background var(--dur-move,260ms) var(--ease-soft,ease),color var(--dur-move,260ms) var(--ease-soft,ease)}
        .ws-services{display:flex;gap:7px;overflow-x:auto;scrollbar-width:none;padding-bottom:3px;margin-bottom:12px}
        .ws-services::-webkit-scrollbar{display:none}
        .ws-services button{flex-shrink:0;border:0;cursor:pointer;border-radius:999px;padding:9px 13px;font:800 12px var(--font-sans);
                            display:inline-flex;align-items:center;gap:6px;white-space:nowrap;
                            transition:background var(--dur-move,260ms) var(--ease-soft,ease),color var(--dur-move,260ms) var(--ease-soft,ease),transform var(--dur-press,120ms) var(--ease-soft,ease)}
        .ws-services button:active{transform:scale(.96)}
        .ws-services i{font-style:normal;font-size:10.5px;font-weight:900;font-variant-numeric:tabular-nums}
        .ws-count{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 2px 10px;font-size:12.5px;font-weight:800}
        .ws-count button{border:0;background:transparent;cursor:pointer;font:800 12px var(--font-sans)}
        .ws-list{display:grid;gap:9px}
        .ws-skel{height:104px;border-radius:19px;animation:wsPulse 1.4s ease-in-out infinite}
        @keyframes wsPulse{0%,100%{opacity:1}50%{opacity:.55}}
        :global(.ws-card){position:relative;display:flex;align-items:flex-start;gap:12px;border-radius:19px;padding:14px 14px 14px 12px;
                 overflow:hidden;text-decoration:none;
                 transition:transform var(--dur-move,260ms) var(--ease-soft,ease),box-shadow var(--dur-move,260ms) var(--ease-soft,ease);
                 animation:wsIn var(--dur-enter,460ms) var(--ease-spring,ease) backwards;animation-delay:calc(var(--i,0) * 45ms)}
        @keyframes wsIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
        @media (hover:hover){
          :global(.ws-card:hover){transform:translateY(-3px);
            box-shadow:0 16px 30px -15px color-mix(in srgb, var(--row-hue, var(--brand)) 50%, transparent), var(--shadow-soft)}
          :global(.ws-card:hover) .ws-ico{transform:scale(1.06)}
        }
        :global(.ws-card:active){transform:scale(.985);transition-duration:var(--dur-press,120ms)}
        :global(.ws-card:focus-visible){outline:2px solid var(--brand);outline-offset:2px}
        .ws-rail{position:absolute;inset-inline-start:0;top:0;bottom:0;width:4px;border-start-end-radius:4px;border-end-end-radius:4px}
        .ws-ico{width:46px;height:46px;border-radius:15px;display:grid;place-items:center;flex-shrink:0;
                transition:transform var(--dur-move,260ms) var(--ease-spring,ease)}
        .ws-body{flex:1;min-width:0;display:block}
        .ws-head{display:flex;align-items:center;gap:8px;justify-content:space-between}
        .ws-head b{font-size:14.5px;font-weight:900;line-height:1.4;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .ws-head em{flex-shrink:0;font-style:normal;font-size:10.5px;font-weight:900;border-radius:999px;padding:4px 8px;
                    display:inline-flex;align-items:center;gap:3px;font-variant-numeric:tabular-nums}
        .ws-head em i{font-style:normal;font-weight:700}
        .ws-body>small{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:11.5px;line-height:1.7;margin-top:4px}
        .ws-body>small span{display:inline-flex;align-items:center;gap:3px;font-variant-numeric:tabular-nums}
        .ws-pills{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px}
        .ws-pills i{font-style:normal;font-size:10.5px;font-weight:800;border-radius:8px;padding:4px 8px}
        .ws-onsite{display:inline-flex;align-items:center;gap:4px;margin-top:8px;font-size:11px;font-weight:900}
        .ws-empty{border-radius:22px;padding:30px 20px;text-align:center;display:grid;justify-items:center;gap:10px}
        .ws-empty>span{width:56px;height:56px;border-radius:18px;display:grid;place-items:center}
        .ws-empty b{font-size:15px;font-weight:900}
        .ws-empty p{margin:0 0 6px;font-size:12.5px;line-height:1.95;max-width:34ch}
        .ws-hint{margin:14px 0 0;font-size:12px;line-height:1.9;text-align:center;border-radius:14px;padding:12px}
        @media (prefers-reduced-motion: reduce){
          :global(.ws-card),:global(.ws-card:hover),:global(.ws-card:active),.ws-ico,.ws-chip:active,.ws-services button:active{transform:none;animation:none}
        }
      `}</style>
    </div>
  );
}
