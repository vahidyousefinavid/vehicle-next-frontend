/**
 * Design tokens for inline styles.
 *
 * Every value is a CSS variable reference rather than a literal, so the same
 * inline style renders correctly in both themes — the variables are redefined
 * under `html[data-theme="light"]` in globals.css. Dark values are unchanged
 * from the original palette, so the dark theme is pixel-identical.
 *
 * Because these are `var(...)` strings and no longer hex, the old
 * `${C.green}1F` alpha-suffix trick can't work. Use `alpha()` instead:
 *   background: alpha(C.green, 12)
 */
export const C = {
  green:      'var(--green)',
  greenDark:  'var(--green-dark)',
  greenGlow:  'var(--green-glow)',
  amber:      'var(--amber)',
  red:        'var(--red)',
  blue:       'var(--blue)',

  bg:         'var(--bg)',
  bgElevated: 'var(--bg-elevated)',
  heroStart:  'var(--hero-start)',
  heroMid:    'var(--hero-mid)',
  heroEnd:    'var(--hero-end)',

  surface:      'var(--surface)',
  surface2:     'var(--surface-2)',
  surfaceSolid: 'var(--surface-solid)',

  /* neutral overlay fills — what used to be literal rgba(255,255,255,0.0X) */
  fill1: 'var(--fill-1)',
  fill2: 'var(--fill-2)',
  fill3: 'var(--fill-3)',
  fill4: 'var(--fill-4)',
  fill5: 'var(--fill-5)',

  textStrong: 'var(--text-strong)',
  text:       'var(--text)',
  text2:      'var(--text-2)',
  muted:      'var(--muted)',
  text4:      'var(--text-4)',
  subtle:     'var(--subtle)',
  onAccent:   'var(--on-accent)',

  navBg:    'var(--nav-bg)',
  tabbarBg: 'var(--tabbar-bg)',

  border:       'var(--border)',
  borderStrong: 'var(--border-strong)',

  shadowGlass:  'var(--shadow-glass)',
  shadowCard:   'var(--shadow-card)',
  shadowNav:    'var(--shadow-nav)',
  shadowTabbar: 'var(--shadow-tabbar)',
  shadowSoft:    'var(--shadow-soft)',
  shadowHero:    'var(--shadow-hero)',
  shadowPopover: 'var(--shadow-popover)',
  shadowSheet:   'var(--shadow-sheet)',
  shadowLift:    'var(--shadow-lift)',
  onHero:        'var(--on-hero)',
  onHeroMuted:   'var(--on-hero-muted)',
  glassBlur:    'var(--glass-blur)',

  statusOk:      'var(--status-ok)',
  statusWarn:    'var(--status-warn)',
  statusDanger:  'var(--status-danger)',
  statusExpired: 'var(--status-expired)',
  statusInfo:    'var(--status-info)',
  statusNeutral: 'var(--status-neutral)',
  statusMint:    'var(--status-mint)',
  blueLight:     'var(--blue-light)',
} as const;

/** One hue per service type — see --svc-* in globals.css. */
export const SVC_COLOR = {
  oil:        'var(--svc-oil)',
  tire:       'var(--svc-tire)',
  brake:      'var(--svc-brake)',
  filter:     'var(--svc-filter)',
  plug:       'var(--svc-plug)',
  gearbox:    'var(--svc-gearbox)',
  timing:     'var(--svc-timing)',
  battery:    'var(--svc-battery)',
  tuning:     'var(--svc-tuning)',
  ac:         'var(--svc-ac)',
  paint:      'var(--svc-paint)',
  suspension: 'var(--svc-suspension)',
  other:      'var(--svc-other)',
} as const;

/**
 * Translucent variant of any colour — a hex literal, a `var(--x)`, or a prop
 * passed down from a caller. `color-mix` is what makes this work on variables;
 * the hex-suffix form it replaces only ever worked on literals.
 *
 * @param percent opacity 0–100.
 */
export function alpha(color: string, percent: number): string {
  return `color-mix(in srgb, ${color} ${percent}%, transparent)`;
}

export type Status = 'ok' | 'warn' | 'danger' | 'expired';

export const STATUS_THEME: Record<Status, { color: string; bg: string; border: string }> = {
  ok:      { color: C.statusOk,      bg: alpha(C.statusOk, 10),      border: alpha(C.statusOk, 28) },
  warn:    { color: C.statusWarn,    bg: alpha(C.statusWarn, 10),    border: alpha(C.statusWarn, 28) },
  danger:  { color: C.statusDanger,  bg: alpha(C.statusDanger, 10),  border: alpha(C.statusDanger, 28) },
  expired: { color: C.statusExpired, bg: alpha(C.statusExpired, 10), border: alpha(C.statusExpired, 28) },
};

export function statusLabel(status: Status, days: number | null): string {
  if (days === null) return '';
  if (status === 'expired') return 'منقضی شده';
  if (days === 0) return 'امروز';
  return `${days} روز`;
}
