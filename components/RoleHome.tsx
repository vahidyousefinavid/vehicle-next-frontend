'use client';
import Link from 'next/link';
import { C, alpha } from './ui';
import { ChevronLeftIcon } from './icons';

/**
 * The shared spine of all three home screens.
 *
 * A car owner, a workshop and a parts seller each used to land on a different
 * kind of screen — one a service grid, one a form, one a product list — so the
 * app felt like three products. These are the pieces every role's home is now
 * built from: the same greeting, the same headline figure, the same queue of
 * work that needs an answer. Only the content differs, which is where the roles
 * genuinely differ.
 */

/** Persian digits, grouped, and tabular so columns of figures line up. */
export function fa(n: number | undefined | null, opts?: Intl.NumberFormatOptions): string {
  if (n === undefined || n === null || Number.isNaN(n)) return '—';
  return n.toLocaleString('fa-IR', opts);
}

export function toman(n?: number | null): string {
  if (!n) return '—';
  return `${fa(n)} تومان`;
}

export function RoleGreeting({
  eyebrow, title, subtitle, right,
}: {
  eyebrow: string; title: string; subtitle: string; right?: React.ReactNode;
}) {
  return (
    <header className="rh-greet">
      <div style={{ minWidth: 0 }}>
        <p className="rh-eyebrow" style={{ color: C.green }}>{eyebrow}</p>
        <h1 style={{ color: C.textStrong }}>{title}</h1>
        <p className="rh-sub" style={{ color: C.muted }}>{subtitle}</p>
      </div>
      {right && <div className="rh-greet-side">{right}</div>}
    </header>
  );
}

/**
 * One number leads each home — takings for a workshop, sales for a seller.
 * Everything smaller sits beside it, so the eye lands on the figure that
 * answers "how am I doing" before anything asks for input.
 */
export function HeroStat({
  label, value, unit, note, tone = C.green, side,
}: {
  label: string; value: string; unit?: string; note?: string; tone?: string;
  side?: { label: string; value: string; tone?: string }[];
}) {
  return (
    <section className="rh-hero" style={{ background: C.surfaceSolid, boxShadow: C.shadowSoft }}>
      <div className="rh-hero-main">
        <p style={{ color: C.muted }}>{label}</p>
        <b style={{ color: tone }}>
          <span className="rh-fig">{value}</span>
          {unit && <i style={{ color: C.muted }}>{unit}</i>}
        </b>
        {note && <small style={{ color: C.subtle }}>{note}</small>}
      </div>
      {side && side.length > 0 && (
        <div className="rh-hero-side">
          {side.map((s) => (
            <div key={s.label} style={{ background: C.fill2 }}>
              <b className="rh-fig" style={{ color: s.tone || C.text }}>{s.value}</b>
              <small style={{ color: C.muted }}>{s.label}</small>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/** The single thing that needs an answer today. Absent when there is nothing. */
export function QueueCard({
  icon, title, body, cta, href, tone = C.statusWarn,
}: {
  icon: React.ReactNode; title: string; body: string; cta: string; href: string; tone?: string;
}) {
  return (
    <Link href={href} className="rh-queue" style={{ background: alpha(tone, 10), boxShadow: C.shadowSoft }}>
      <span style={{ background: alpha(tone, 16), color: tone }}>{icon}</span>
      <div>
        <b style={{ color: C.textStrong }}>{title}</b>
        <small style={{ color: C.text2 }}>{body}</small>
      </div>
      <em style={{ color: tone }}>{cta}<ChevronLeftIcon size={14} /></em>
    </Link>
  );
}

/** Tools scroll sideways rather than forming an equal-weight block of squares. */
export function ToolRow({ tools }: { tools: { href: string; label: string; hint: string; icon: React.ReactNode; hue: string }[] }) {
  return (
    <div className="rh-tools">
      {tools.map((t) => (
        <Link key={t.href + t.label} href={t.href} className="rh-tool" style={{ background: C.surfaceSolid, boxShadow: C.shadowSoft }}>
          <span style={{ background: alpha(t.hue, 12), color: t.hue }}>{t.icon}</span>
          <b style={{ color: C.textStrong }}>{t.label}</b>
          <small style={{ color: C.muted }}>{t.hint}</small>
        </Link>
      ))}
    </div>
  );
}

export function SectionHead({ title, action }: { title: string; action?: { label: string; href: string } }) {
  return (
    <div className="rh-head">
      <h2 style={{ color: C.textStrong }}>{title}</h2>
      {action && <Link href={action.href} style={{ color: C.green }}>{action.label}</Link>}
    </div>
  );
}

export const ROLE_HOME_CSS = `
.rh-fig{font-variant-numeric:tabular-nums;font-feature-settings:'tnum' 1}
.rh-greet{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:14px 2px 18px}
.rh-eyebrow{margin:0;font-size:11.5px;font-weight:900;letter-spacing:.02em}
.rh-greet h1{margin:5px 0 0;font-size:23px;font-weight:950;letter-spacing:-.5px;text-wrap:balance}
.rh-sub{margin:4px 0 0;font-size:12.5px;font-weight:600}
.rh-greet-side{display:flex;align-items:center;gap:8px;flex-shrink:0}
.rh-hero{border-radius:22px;padding:18px 18px 16px;display:grid;gap:14px;margin-bottom:14px}
.rh-hero-main p{margin:0;font-size:12px;font-weight:800}
.rh-hero-main b{display:flex;align-items:baseline;gap:6px;margin-top:6px;font-size:30px;font-weight:950;letter-spacing:-.5px}
.rh-hero-main b i{font-style:normal;font-size:13px;font-weight:800}
.rh-hero-main small{display:block;margin-top:6px;font-size:11.5px;line-height:1.6}
.rh-hero-side{display:grid;grid-template-columns:repeat(auto-fit,minmax(112px,1fr));gap:9px}
.rh-hero-side>div{border-radius:15px;padding:11px 12px}
.rh-hero-side b{display:block;font-size:17px;font-weight:950}
.rh-hero-side small{display:block;margin-top:2px;font-size:11px;font-weight:700}
.rh-queue{display:flex;align-items:center;gap:12px;border-radius:20px;padding:14px 15px;text-decoration:none;margin-bottom:14px;transition:transform .16s ease}
.rh-queue:active{transform:scale(.99)}
.rh-queue>span{width:44px;height:44px;border-radius:15px;display:grid;place-items:center;flex-shrink:0}
.rh-queue>div{flex:1;min-width:0}
.rh-queue b{display:block;font-size:14px;font-weight:900;line-height:1.45}
.rh-queue small{display:block;font-size:11.5px;margin-top:3px;line-height:1.6}
.rh-queue em{font-style:normal;display:flex;align-items:center;gap:3px;font-size:12px;font-weight:900;flex-shrink:0;white-space:nowrap}
.rh-tools{display:flex;gap:10px;overflow-x:auto;scrollbar-width:none;padding:2px 2px 6px}
.rh-tools::-webkit-scrollbar{display:none}
.rh-tool{flex:0 0 auto;width:112px;border-radius:18px;padding:13px 12px;text-decoration:none;display:grid;gap:3px;transition:transform .18s cubic-bezier(.16,1,.3,1)}
.rh-tool:hover{transform:translateY(-2px)}
.rh-tool:active{transform:scale(.98)}
.rh-tool>span{width:38px;height:38px;border-radius:13px;display:grid;place-items:center;margin-bottom:6px}
.rh-tool b{font-size:12.5px;font-weight:900}
.rh-tool small{font-size:10.5px;font-weight:700}
.rh-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin:22px 2px 12px}
.rh-head h2{margin:0;font-size:17px;font-weight:950}
.rh-head a{font-size:12.5px;font-weight:800;text-decoration:none}

`;
