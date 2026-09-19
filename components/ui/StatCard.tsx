'use client';
import { C, alpha } from './tokens';

export interface Stat {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ReactNode;
  color?: string;
}

/**
 * The figures at the top of a screen.
 *
 * The grid used to be `repeat(stats.length, 1fr)`, so four numbers became four
 * columns on a 390px phone — about 80px each, which is not enough for a sum in
 * تومان and its label. It wraps now: two across on a phone, the full row once
 * there is space. Values are tabular so a column of numbers lines up, and the
 * hierarchy is value → label → sub rather than three near-identical greys.
 */
export function StatGrid({ stats }: { stats: Stat[] }) {
  return (
    <div className="sg" data-n={stats.length}>
      {stats.map((s) => (
        <div key={s.label} className="sg-card" style={{ background: C.surfaceSolid, boxShadow: C.shadowSoft }}>
          {s.color && <span className="sg-accent" style={{ background: `linear-gradient(90deg, ${s.color}, ${alpha(s.color, 30)})` }} />}
          {s.icon && (
            <span className="sg-ico" style={{ background: alpha(s.color ?? C.green, 12), color: s.color ?? C.green }}>
              {s.icon}
            </span>
          )}
          <b style={{ color: s.color ?? C.textStrong }}>{s.value}</b>
          <small style={{ color: C.text2 }}>{s.label}</small>
          {s.sub && <i style={{ color: C.subtle }}>{s.sub}</i>}
        </div>
      ))}

      <style jsx>{`
        .sg{display:grid;grid-template-columns:repeat(2,1fr);gap:9px}
        .sg[data-n="1"]{grid-template-columns:1fr}
        .sg[data-n="3"]{grid-template-columns:repeat(3,1fr)}
        @media (min-width:520px){
          .sg[data-n="4"]{grid-template-columns:repeat(4,1fr)}
          .sg[data-n="5"],.sg[data-n="6"]{grid-template-columns:repeat(3,1fr)}
        }
        .sg-card{
          position:relative;overflow:hidden;border-radius:18px;padding:15px 10px 13px;
          display:grid;justify-items:center;gap:2px;text-align:center;
          transition:transform var(--dur-move,260ms) var(--ease-soft,ease);
        }
        .sg-accent{position:absolute;top:0;inset-inline:0;height:3px}
        .sg-ico{width:34px;height:34px;border-radius:11px;display:grid;place-items:center;margin-bottom:7px}
        .sg-card b{font-size:19px;font-weight:950;line-height:1.15;font-variant-numeric:tabular-nums;
                   overflow:hidden;text-overflow:ellipsis;max-width:100%}
        .sg-card small{font-size:11px;font-weight:800;line-height:1.5;margin-top:4px}
        .sg-card i{font-style:normal;font-size:10px;font-weight:700;line-height:1.5}
      `}</style>
    </div>
  );
}
