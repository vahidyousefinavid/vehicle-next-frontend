'use client';
import Link from 'next/link';
import { C, alpha } from './ui';
import { ChevronLeftIcon, ChevronRightIcon, SearchIcon } from './icons';

/**
 * The shared kit every list and detail screen is built from.
 *
 * Each screen used to invent its own card: different radius, different border,
 * state written as a sentence somewhere in the middle. Reading one told you
 * nothing about how to read the next. These pieces give the whole app one row
 * shape and one way of answering "what's the state here" — a strip of derived
 * figures above the list, and a coloured rail plus a chip on every row, so the
 * answer is visible before anything is read.
 */

export function fa(n: number | null | undefined, opts?: Intl.NumberFormatOptions): string {
  if (n === undefined || n === null || Number.isNaN(n)) return '—';
  return n.toLocaleString('fa-IR', opts);
}
export const money = (n?: number | null) => (n ? `${fa(n)} تومان` : '—');
/** Long sums are unreadable in full on a phone; a glance wants the magnitude. */
export function shortMoney(n?: number | null): string {
  if (!n) return '—';
  if (n >= 1_000_000_000) return `${fa(+(n / 1_000_000_000).toFixed(1))} میلیارد`;
  if (n >= 1_000_000) return `${fa(+(n / 1_000_000).toFixed(1))} میلیون`;
  if (n >= 1_000) return `${fa(Math.round(n / 1000))} هزار`;
  return fa(n);
}

export function ScreenHeader({
  eyebrow, title, subtitle, back = true, action,
}: {
  eyebrow?: string; title: string; subtitle?: string;
  back?: boolean | string; action?: React.ReactNode;
}) {
  const href = typeof back === 'string' ? back : undefined;
  return (
    <header className="sk-head">
      {back !== false && (
        href
          ? <Link href={href} className="sk-back" aria-label="بازگشت" style={{ background: C.surfaceSolid, color: C.text2, boxShadow: C.shadowSoft }}><ChevronRightIcon size={17} /></Link>
          : <button type="button" onClick={() => history.back()} className="sk-back" aria-label="بازگشت" style={{ background: C.surfaceSolid, color: C.text2, boxShadow: C.shadowSoft }}><ChevronRightIcon size={17} /></button>
      )}
      <div className="sk-head-text">
        {eyebrow && <p style={{ color: C.green }}>{eyebrow}</p>}
        <h1 style={{ color: C.textStrong }}>{title}</h1>
        {subtitle && <small style={{ color: C.muted }}>{subtitle}</small>}
      </div>
      {action && <div className="sk-head-action">{action}</div>}
    </header>
  );
}

export interface GlanceItem {
  label: string;
  value: string;
  hint?: string;
  tone?: string;
  /** Draws attention when the figure is the reason to act. */
  alert?: boolean;
}

/** The answer to the screen's question, before the list that proves it. */
export function Glance({ items }: { items: GlanceItem[] }) {
  const shown = items.filter(Boolean);
  if (!shown.length) return null;
  return (
    <div className="sk-glance">
      {shown.map((g) => (
        <div
          key={g.label}
          style={{
            background: g.alert ? alpha(g.tone || C.statusExpired, 10) : C.surfaceSolid,
            boxShadow: C.shadowSoft,
          }}
        >
          <b className="sk-fig" style={{ color: g.tone || C.textStrong }}>{g.value}</b>
          <small style={{ color: C.muted }}>{g.label}</small>
          {g.hint && g.value !== '—' && <i style={{ color: g.tone || C.subtle }}>{g.hint}</i>}
        </div>
      ))}
    </div>
  );
}

export function Chip({ tone = C.muted, children }: { tone?: string; children: React.ReactNode }) {
  return (
    <span className="sk-chip" style={{ color: tone, background: alpha(tone, 12) }}>{children}</span>
  );
}

/**
 * One row shape for every list in the app. The rail on the leading edge carries
 * the row's state as colour, so a list can be triaged without reading it.
 */
export function Row({
  hue = C.green, icon, title, meta, chips, trailing, href, onClick, actions, dim,
}: {
  hue?: string;
  icon?: React.ReactNode;
  title: React.ReactNode;
  meta?: React.ReactNode;
  chips?: React.ReactNode;
  trailing?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  actions?: React.ReactNode;
  dim?: boolean;
}) {
  const inner = (
    <>
      <span className="sk-rail" style={{ background: hue }} />
      {icon && <span className="sk-ico" style={{ background: alpha(hue, 12), color: hue }}>{icon}</span>}
      <span className="sk-body">
        <b style={{ color: C.textStrong }}>{title}</b>
        {meta && <small style={{ color: C.muted }}>{meta}</small>}
        {chips && <span className="sk-chips">{chips}</span>}
      </span>
      {trailing && <span className="sk-trail">{trailing}</span>}
      {(href || onClick) && !trailing && <ChevronLeftIcon size={16} color={C.subtle} />}
    </>
  );

  const style = {
    background: C.surfaceSolid,
    boxShadow: C.shadowSoft,
    opacity: dim ? 0.62 : 1,
    ['--row-hue' as string]: hue,
  } as React.CSSProperties;

  return (
    <div className="sk-row-wrap">
      {href
        ? <Link href={href} className="sk-row" style={style}>{inner}</Link>
        : onClick
          ? <button type="button" onClick={onClick} className="sk-row" style={style}>{inner}</button>
          : <div className="sk-row" style={style}>{inner}</div>}
      {actions && <div className="sk-actions">{actions}</div>}
    </div>
  );
}

export function RowList({ children }: { children: React.ReactNode }) {
  return <div className="sk-list">{children}</div>;
}

export function Filters<T extends string>({
  options, value, onChange,
}: { options: { key: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="sk-filters">
      {options.map((o) => {
        const on = o.key === value;
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange(o.key)}
            style={{
              background: on ? `linear-gradient(140deg, ${C.green}, ${C.greenDark})` : C.surfaceSolid,
              color: on ? C.onAccent : C.text2,
              boxShadow: on ? C.shadowBrand : C.shadowSoft,
            }}
          >
            {o.label}
            {o.count !== undefined && <i className="sk-fig" style={{ color: on ? 'rgba(255,255,255,.8)' : C.subtle }}>{fa(o.count)}</i>}
          </button>
        );
      })}
    </div>
  );
}

export function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="sk-search" style={{ background: C.fill2 }}>
      <SearchIcon size={17} color={C.muted} />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={{ color: C.textStrong }} />
      {value && <button type="button" onClick={() => onChange('')} style={{ color: C.muted }} aria-label="پاک کردن">✕</button>}
    </div>
  );
}

export function Screen({ children, dense }: { children: React.ReactNode; dense?: boolean }) {
  return (
    <div className="sk-screen" data-density={dense ? 'dense' : undefined}>
      <main className="sk-main">{children}</main>
    </div>
  );
}

export const SCREEN_CSS = `
.sk-fig{font-variant-numeric:tabular-nums;font-feature-settings:'tnum' 1}
.sk-screen{min-height:100vh;background:var(--bg-gradient)}
.sk-main{max-width:640px;margin:0 auto;padding:var(--sp-3) var(--sp-4) calc(104px + env(safe-area-inset-bottom))}
.sk-head{display:flex;align-items:center;gap:11px;padding:8px 0 16px}
.sk-back{width:44px;height:44px;border:0;border-radius:14px;display:grid;place-items:center;cursor:pointer;flex-shrink:0;text-decoration:none;transition:transform .16s ease}
.sk-back:active{transform:scale(.94)}
.sk-head-text{flex:1;min-width:0}
.sk-head-text p{margin:0 0 3px;font-size:11px;font-weight:900}
.sk-head-text h1{margin:0;font-size:20px;font-weight:950;letter-spacing:-.4px}
.sk-head-text small{display:block;margin-top:3px;font-size:11.5px;font-weight:600}
.sk-head-action{flex-shrink:0}
.sk-glance{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--sp-2);margin-bottom:var(--sp-4)}
@media(min-width:560px){.sk-glance{grid-template-columns:repeat(4,minmax(0,1fr))}}
.sk-glance>div{border-radius:var(--r-plate);padding:var(--sp-3);min-width:0}
.sk-glance b{display:block;font-size:18px;font-weight:950;letter-spacing:-.3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sk-glance small{display:block;margin-top:3px;font-size:10.5px;font-weight:800}
.sk-glance i{display:block;margin-top:4px;font-style:normal;font-size:10px;font-weight:800}
.sk-filters{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;padding:2px 2px 6px;margin-bottom:12px}
.sk-filters::-webkit-scrollbar{display:none}
.sk-filters button{flex:0 0 auto;border:0;border-radius:999px;padding:12px 16px;font:900 12.5px var(--font-sans);cursor:pointer;display:flex;align-items:center;gap:6px;transition:transform .16s ease}
.sk-filters button:active{transform:scale(.97)}
.sk-filters i{font-style:normal;font-size:11px;font-weight:900}
.sk-search{display:flex;align-items:center;gap:9px;border-radius:15px;padding:12px 14px;margin-bottom:14px}
.sk-search input{flex:1;min-width:0;border:0;outline:0;background:transparent;font:700 13.5px var(--font-sans);padding:12px 0;margin:-12px 0}
.sk-search button{border:0;background:transparent;cursor:pointer;font-size:13px;padding:0 2px}
.sk-list{display:grid;gap:var(--sp-2)}
.sk-row-wrap{display:grid;gap:0}
.sk-row{position:relative;display:flex;align-items:center;gap:var(--sp-3);border:0;width:100%;text-align:right;border-radius:18px;padding:13px 14px 13px 12px;overflow:hidden;text-decoration:none;font-family:var(--font-sans);cursor:pointer;transition:transform var(--dur-move,260ms) var(--ease-soft,ease),box-shadow var(--dur-move,260ms) var(--ease-soft,ease),opacity var(--dur-move,260ms) var(--ease-soft,ease)}
a.sk-row:hover,button.sk-row:hover{transform:translateY(-2px)}
.sk-row:active{transform:scale(.985);transition-duration:var(--dur-press,120ms)}
.sk-row:active .sk-ico{transform:scale(.94);transition-duration:var(--dur-press,120ms)}
.sk-row:focus-visible{outline:2px solid var(--brand);outline-offset:2px}
/* Hover belongs to pointers; on a phone it latches after a tap and the row
   stays lifted. The shadow is tinted with the row's own state colour, which is
   what ties a list to the rails running down its leading edge. */
@media (hover:hover){
  a.sk-row:hover,button.sk-row:hover{
    transform:translateY(-2px);
    box-shadow:0 14px 26px -14px color-mix(in srgb, var(--row-hue, var(--brand)) 50%, transparent), var(--shadow-soft);
  }
  a.sk-row:hover .sk-ico,button.sk-row:hover .sk-ico{transform:scale(1.06)}
}
@media (prefers-reduced-motion: reduce){
  .sk-row,.sk-row:active,.sk-row:hover,.sk-row .sk-ico{transform:none}
}
div.sk-row{cursor:default}
.sk-rail{position:absolute;inset-inline-start:0;top:0;bottom:0;width:4px;border-start-end-radius:4px;border-end-end-radius:4px}
.sk-ico{width:44px;height:44px;border-radius:14px;display:grid;place-items:center;flex-shrink:0;transition:transform var(--dur-move,260ms) var(--ease-spring,ease)}
.sk-body{flex:1;min-width:0;display:block}
.sk-body b{display:block;font-size:14px;font-weight:900;line-height:1.45;overflow:hidden;text-overflow:ellipsis}
.sk-body small{display:block;font-size:11.5px;margin-top:3px;line-height:1.6}
.sk-chips{display:flex;flex-wrap:wrap;gap:5px;margin-top:7px}
.sk-chip{display:inline-flex;align-items:center;gap:4px;border-radius:999px;padding:4px 9px;font-size:10.5px;font-weight:900;white-space:nowrap;font-variant-numeric:tabular-nums}
.sk-trail{flex-shrink:0;text-align:left;display:flex;flex-direction:column;align-items:flex-end;gap:3px;font-variant-numeric:tabular-nums}
.sk-actions{display:flex;gap:7px;padding:9px 14px 0;justify-content:flex-end}
.sk-empty{text-align:center;padding:30px 16px;font-size:13px}
`;
