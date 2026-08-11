'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { svcMeta } from './serviceMeta';
import { C, alpha } from './ui/tokens';

/**
 * The car, with its services in orbit around it.
 *
 * The same thing as the scanning globe on Karnama, with a car in place of the sphere: a cloud
 * of points sampled over a real surface, rotated by a matrix and divided through by depth, on
 * a plain 2D canvas. No three.js, no WebGL, no dependency — about 4 KB against the ~150 KB of
 * the smallest 3D library that could draw it, and this is a phone app for people on Iranian
 * mobile data.
 *
 * Points only, deliberately. An earlier version drew filled faces with edges, and the lines
 * fought the icons riding around them; a cloud reads as a body from a distance and disappears
 * politely behind whatever is in front of it. A beam sweeps the length of the car the way the
 * globe's sweeps its latitudes.
 *
 * The service nodes are real DOM buttons placed from the *same* projection each frame — which
 * is what canvas cannot give: a tap target, a focus ring, keyboard access, and Persian text the
 * browser shapes properly. Picking one calls `onPick`, exactly as the old strip of service
 * cards did; the request flow is unchanged.
 */

interface Pt { x: number; y: number; z: number }

/**
 * Side profile of the body, in world units. A modern crossover: tall glasshouse, short
 * overhangs, big wheels sitting proud of the sills — the shape of the cars people actually
 * aspire to now, rather than the low three-box saloon this started as.
 */
const PROFILE: [number, number][] = [
  [-1.02, 0.17], [-1.08, 0.42], [-1.00, 0.58],
  [-0.63, 0.80], [ 0.20, 0.82], [ 0.62, 0.53],
  [ 1.00, 0.45], [ 1.08, 0.24], [ 0.97, 0.16],
];

const WHEELS: [number, number][] = [[-0.62, 0.21], [0.66, 0.21]];
const WHEEL_R = 0.25;

/** Widest at the sills, tapering into the roof. A straight extrusion reads as a brick. */
const SILL_HW = 0.43;
const ROOF_HW = 0.32;
function halfWidth(y: number): number {
  const t = Math.max(0, Math.min(1, (y - 0.46) / 0.36));
  return SILL_HW - (SILL_HW - ROOF_HW) * t;
}

const ORBIT_R = 1.95;
const ORBIT_Y = 0.36;
/** Looking down at the scene. sin(TILT) is also how squashed the orbit reads. */
const TILT = 0.66;
/** Camera distance in world units — near enough that the front of the ring reads bigger. */
const CAM = 4.6;

/** Point spacing over the shell. Small enough to read as a surface, few enough for a phone. */
const STEP = 0.095;

function cssVar(el: Element, name: string, fallback: string): string {
  const v = getComputedStyle(el).getPropertyValue(name).trim();
  return v || fallback;
}

function withAlpha(color: string, a: number): string {
  const c = color.trim();
  if (c.startsWith('#')) {
    const hex = c.length === 4 ? c.slice(1).split('').map(ch => ch + ch).join('') : c.slice(1, 7);
    const n = parseInt(hex, 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  }
  const nums = c.match(/[\d.]+/g);
  if (nums && nums.length >= 3) return `rgba(${nums[0]}, ${nums[1]}, ${nums[2]}, ${a})`;
  return c;
}

/** Ray casting, so the flanks carry points only where the body actually is. */
function inProfile(x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = PROFILE.length - 1; i < PROFILE.length; j = i++) {
    const [xi, yi] = PROFILE[i];
    const [xj, yj] = PROFILE[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/**
 * The car as a point cloud over its closed surface: the swept bands around the profile, both
 * flanks, and the wheels. Built once at module load — it never changes.
 */
function buildCloud(): Pt[] {
  const pts: Pt[] = [];
  const n = PROFILE.length;

  for (let i = 0; i < n; i++) {
    const [x0, y0] = PROFILE[i];
    const [x1, y1] = PROFILE[(i + 1) % n];
    const steps = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / STEP));
    for (let a = 0; a < steps; a++) {
      const t = a / steps;
      const x = x0 + (x1 - x0) * t;
      const y = y0 + (y1 - y0) * t;
      const hw = halfWidth(y);
      const zSteps = Math.max(2, Math.round((hw * 2) / (STEP * 1.3)));
      for (let b = 0; b <= zSteps; b++) pts.push({ x, y, z: -hw + 2 * hw * (b / zSteps) });
    }
  }

  for (let x = -1.10; x <= 1.10; x += STEP) {
    for (let y = 0.14; y <= 0.84; y += STEP) {
      if (!inProfile(x, y)) continue;
      const hw = halfWidth(y);
      pts.push({ x, y, z: -hw }, { x, y, z: hw });
    }
  }

  // Wheels — four discs, and most of what makes a crossover read as a crossover.
  for (const [wx, wy] of WHEELS) {
    for (const z of [-SILL_HW - 0.02, SILL_HW + 0.02]) {
      for (let r = WHEEL_R; r > 0.04; r -= 0.065) {
        const count = Math.max(7, Math.round((2 * Math.PI * r) / STEP));
        for (let i = 0; i < count; i++) {
          const a = (i / count) * Math.PI * 2;
          pts.push({ x: wx + Math.cos(a) * r, y: wy + Math.sin(a) * r, z });
        }
      }
    }
  }

  return pts;
}

const CLOUD = buildCloud();

export default function ServiceOrbit({ services, onPick }: {
  services: string[];
  onPick: (type: string) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodeRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const iconRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const labelRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [size, setSize] = useState(340);
  const [active, setActive] = useState<string | null>(null);

  // Rotation lives outside React: at 60fps, state would re-render the tree every frame.
  const spinRef = useRef(-0.7);
  const dragRef = useRef({ on: false, x: 0, moved: 0 });
  /* Aiming at a node that never stops moving is a poor tap target — and an impossible one for
     anyone with a tremor. The ring holds still while a pointer is over it or a node has focus. */
  const holdRef = useRef(false);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    /* One number drives everything: the canvas backing store, its CSS box, and the projection
       scale. They were allowed to disagree once — the canvas was clamped to 400 but stretched
       to `width: 100%`, so on a desktop the drawing was scaled horizontally while the DOM nodes
       were placed from the unstretched maths, and the ring came apart from the car. */
    const measure = () => setSize(Math.max(280, Math.min(460, el.clientWidth)));
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    window.addEventListener('resize', measure);
    return () => { ro?.disconnect(); window.removeEventListener('resize', measure); };
  }, []);

  const height = Math.round(size * 0.88);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cx = size / 2;
    const cy = height * 0.5;
    /* World-to-pixel scale, capped so the ring plus a node's 46px hit box always lands inside
       the stage. Picking a fixed divisor instead put the outermost nodes over the edge on a
       320px phone — the widest point of the ring is roughly ORBIT_R * R * 1.06 from centre. */
    const NODE_HALF = 26;
    const R = Math.min(size / 4.9, (size / 2 - NODE_HALF) / (ORBIT_R * 1.12));

    let theme = readTheme();
    function readTheme() {
      const root = document.documentElement;
      return {
        // Deliberately the solid foreground, not a translucent token: canvas multiplies it by
        // globalAlpha, so a token that is already see-through comes out at a fraction of the
        // intended opacity.
        dot: cssVar(root, '--text-strong', '#FFFFFF'),
        accent: cssVar(root, '--green', '#00CEB4'),
      };
    }
    const themeObserver = new MutationObserver(() => { theme = readTheme(); });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Negative angle: the camera looks *down* on the scene, so what is near the viewer falls to
    // the bottom of the frame. With the sign the other way the far half of the ring drew in
    // front of the near half and the whole thing read inside-out.
    const tiltS = Math.sin(-TILT);
    const tiltC = Math.cos(-TILT);

    let raf = 0;
    let last = performance.now();
    let beam = -1.3;
    let visible = true;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 });
    io.observe(canvas);
    const onVisibility = () => { if (!document.hidden) last = performance.now(); };
    document.addEventListener('visibilitychange', onVisibility);

    /** World → screen. `depth` is distance from the camera: negative is nearer. */
    function project(p: Pt, sin: number, cos: number) {
      const x1 = p.x * cos + p.z * sin;
      const z1 = -p.x * sin + p.z * cos;
      const y2 = p.y * tiltC - z1 * tiltS;
      const z2 = p.y * tiltS + z1 * tiltC;
      const k = CAM / (CAM + z2);
      return { sx: cx + x1 * R * k, sy: cy - y2 * R * k, depth: z2, k };
    }

    function draw() {
      const spin = spinRef.current;
      const sin = Math.sin(spin);
      const cos = Math.cos(spin);

      ctx!.clearRect(0, 0, size, height);

      /* ── ground glow ── */
      const glow = ctx!.createRadialGradient(cx, cy + R * 0.45, 2, cx, cy + R * 0.45, R * 1.6);
      glow.addColorStop(0, withAlpha(theme.accent, 0.16));
      glow.addColorStop(1, withAlpha(theme.accent, 0));
      ctx!.globalAlpha = 1;
      ctx!.fillStyle = glow;
      ctx!.fillRect(0, 0, size, height);

      /* ── orbit track: far half before the car, near half after ── */
      const STEPS = 84;
      const track = Array.from({ length: STEPS + 1 }, (_, i) => {
        const a = (i / STEPS) * Math.PI * 2;
        return project({ x: Math.cos(a) * ORBIT_R, y: ORBIT_Y, z: Math.sin(a) * ORBIT_R }, sin, cos);
      });
      function strokeTrack(nearHalf: boolean) {
        ctx!.lineWidth = 1;
        ctx!.strokeStyle = theme.accent;
        ctx!.globalAlpha = nearHalf ? 0.3 : 0.11;
        for (let i = 0; i < STEPS; i++) {
          const p0 = track[i], p1 = track[i + 1];
          if ((p0.depth < 0) !== nearHalf) continue;
          ctx!.beginPath();
          ctx!.moveTo(p0.sx, p0.sy);
          ctx!.lineTo(p1.sx, p1.sy);
          ctx!.stroke();
        }
      }
      strokeTrack(false);

      /* ── the car: far half of the cloud, then the near half over it ── */
      const band = 0.26;
      const dotScale = size / 340;
      for (const pass of [1, -1]) {
        for (const p of CLOUD) {
          const pr = project(p, sin, cos);
          if (pass === 1 ? pr.depth < 0 : pr.depth >= 0) continue;

          // How close this point sits to the sweeping plane, 0–1 — the same idea as the
          // globe's beam, running the length of the car instead of down its latitudes.
          const lit = reduced ? 0 : Math.max(0, 1 - Math.abs(p.x - beam) / band);
          const back = pr.depth >= 0;
          const base = back ? 0.16 : 0.46;

          ctx!.globalAlpha = Math.min(1, base + lit * (back ? 0.3 : 0.5));
          ctx!.fillStyle = lit > 0.05 ? theme.accent : withAlpha(theme.accent, 0.85);
          ctx!.beginPath();
          ctx!.arc(pr.sx, pr.sy, (back ? 0.95 : 1.45) * dotScale * pr.k * (1 + lit * 0.85), 0, Math.PI * 2);
          ctx!.fill();
        }
      }

      strokeTrack(true);
      ctx!.globalAlpha = 1;

      /* ── service nodes: DOM, placed from this same projection ── */
      for (let i = 0; i < services.length; i++) {
        const el = nodeRefs.current[i];
        if (!el) continue;
        const a = (i / services.length) * Math.PI * 2;
        const p = project({ x: Math.cos(a) * ORBIT_R, y: ORBIT_Y, z: Math.sin(a) * ORBIT_R }, sin, cos);
        const scale = Math.max(0.68, Math.min(1.18, p.k));
        // The hit box never scales — only the disc inside it does. Depth used to shrink the
        // whole button, which took the far side of the ring down to a ~25px tap target.
        el.style.transform = `translate3d(${p.sx}px, ${p.sy}px, 0) translate(-50%, -50%)`;
        const icon = iconRefs.current[i];
        if (icon) icon.style.transform = `scale(${scale})`;
        // Small numbers on purpose: the wrapper opens its own stacking context, so these only
        // order the nodes against each other and can never climb over a sheet or a dialog.
        el.style.zIndex = String(100 - Math.round(p.depth * 10));
        el.style.opacity = String(p.depth < 0 ? 1 : 0.5);
        const label = labelRefs.current[i];
        // Twelve labels at once is unreadable, so only the ones swinging to the front carry
        // their name. A label is also wider than its icon, so one out at the edge of the ring
        // would be clipped by the stage — hence the second test: near the front *and* central.
        if (label) label.style.opacity = p.depth < -0.7 && Math.abs(p.sx - cx) < size * 0.34 ? '1' : '0';
      }
    }

    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (!visible || document.hidden) return;
      if (!reduced) {
        beam += dt * 1.1;
        if (beam > 1.3) beam = -1.3;
        if (!dragRef.current.on && !holdRef.current) spinRef.current += dt * 0.16;
      }
      draw();
    }

    draw();
    if (!reduced) raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      themeObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [size, height, services]);

  /* ── drag to spin ──
     Tracked on `window` rather than with setPointerCapture on the wrapper: capturing retargets
     the pointerup, so the browser resolves the following click against the wrapper instead of
     the node button — and tapping a service would silently do nothing. */
  useEffect(() => {
    function move(e: PointerEvent) {
      const d = dragRef.current;
      if (!d.on) return;
      const dx = e.clientX - d.x;
      d.x = e.clientX;
      d.moved += Math.abs(dx);
      spinRef.current -= dx * 0.008;
    }
    function end() { dragRef.current.on = false; }
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
    };
  }, []);

  function pick(type: string) {
    // A drag that happens to end over a node must not also count as choosing it.
    if (dragRef.current.moved > 6) { dragRef.current.moved = 0; return; }
    onPick(type);
  }

  return (
    <div
      ref={wrapRef}
      style={{
        position: 'relative', width: '100%', height,
        display: 'flex', justifyContent: 'center',
        touchAction: 'pan-y', userSelect: 'none', overflow: 'hidden',
        /* Opens a stacking context. Without it the nodes' z-index competed with the whole page
           and the orbit sat on top of the request sheet it had just opened. */
        zIndex: 0, isolation: 'isolate',
      }}
      onPointerDown={e => { dragRef.current = { on: true, x: e.clientX, moved: 0 }; }}
      onPointerEnter={() => { holdRef.current = true; }}
      onPointerLeave={() => { holdRef.current = false; }}
    >
      {/* The stage is exactly `size` wide, so canvas pixels and node coordinates share one
          origin however wide the column around it happens to be. */}
      <div style={{ position: 'relative', width: size, height, flexShrink: 0 }}>
        <canvas
          ref={canvasRef}
          style={{ position: 'absolute', top: 0, left: 0, width: size, height, display: 'block' }}
          role="img"
          aria-label="خودرو با خدمات پیرامون آن"
        />

        {services.map((type, i) => {
          const meta = svcMeta(type);
          const Icon = meta.icon;
          const on = active === type;
          return (
            <button
              key={type}
              ref={el => { nodeRefs.current[i] = el; }}
              type="button"
              onClick={() => pick(type)}
              onFocus={() => { holdRef.current = true; setActive(type); }}
              onBlur={() => { holdRef.current = false; setActive(null); }}
              onMouseEnter={() => setActive(type)}
              onMouseLeave={() => setActive(null)}
              aria-label={`درخواست ${type}`}
              style={{
                /* 46px square regardless of depth: the WCAG floor for a tap target is 44, and
                   these are the primary control of the whole section. */
                position: 'absolute', top: 0, left: 0, width: 46, height: 46,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                borderRadius: 15, fontFamily: 'var(--font-sans)', willChange: 'transform',
              }}
            >
              <span
                ref={el => { iconRefs.current[i] = el; }}
                style={{
                  width: 38, height: 38, borderRadius: 13,
                  background: on ? alpha(meta.color, 28) : alpha(meta.color, 14),
                  border: `1px solid ${alpha(meta.color, on ? 60 : 32)}`,
                  boxShadow: on ? `0 0 18px ${alpha(meta.color, 45)}` : 'none',
                  color: meta.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background .15s, box-shadow .15s, border-color .15s',
                }}
              >
                <Icon size={18} />
              </span>
              <span
                ref={el => { labelRefs.current[i] = el; }}
                style={{
                  position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
                  fontSize: 10, fontWeight: 700, color: C.text2, whiteSpace: 'nowrap',
                  background: alpha(C.surfaceSolid, 88), borderRadius: 6, padding: '1px 6px',
                  transition: 'opacity .25s', pointerEvents: 'none',
                }}
              >
                {type}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
