export type Theme = 'dark' | 'light';
/** The accent family. The neutrals never change — only the one colour the
 *  interface uses to say "you can act on this". */
export type Skin = 'amber' | 'blue' | 'emerald' | 'indigo' | 'rose';

export const THEME_KEY = 'vtheme';
export const SKIN_KEY = 'vskin';

/** Dark is the product's identity — the graphite instrument-cluster skin the
 *  app is designed around, and the one that survives a workshop under bad
 *  light. Light is a first-class daylight alternate, chosen from the toggle;
 *  the OS preference deliberately does not override the choice. */
export const DEFAULT_THEME: Theme = 'dark';
export const DEFAULT_SKIN: Skin = 'amber';

/**
 * The five accents, and the swatch each one shows in the picker.
 *
 * Every one of them clears 4.5:1 as text on all three grounds of its theme —
 * canvas, surface and raised in dark; white, paper and tint in light — and
 * carries its button label at 4.5:1 too. That is what the set is limited to;
 * `indigo` is `#9580FF` rather than the old `#8B72FF` because the original
 * landed at 4.48 on the raised surface, which is a fail.
 */
export const SKINS: { id: Skin; label: string; dark: string; light: string }[] = [
  { id: 'amber',   label: 'کهربایی',  dark: '#F2A413', light: '#9C5C08' },
  { id: 'blue',    label: 'اقیانوسی', dark: '#5AA2F0', light: '#1D5FBF' },
  { id: 'emerald', label: 'زمردی',    dark: '#2DD4A3', light: '#0E7A63' },
  { id: 'indigo',  label: 'نیلی',     dark: '#9580FF', light: '#5B3FD6' },
  { id: 'rose',    label: 'ارغوانی',  dark: '#F472B6', light: '#B01362' },
];

const SKIN_IDS = SKINS.map((s) => s.id);

/**
 * Runs as a blocking inline script in <head>, before first paint, so a light
 * user never sees a dark flash (and vice versa). Kept as a string because it
 * has to execute before React hydrates. It stamps both axes — theme and skin —
 * because an accent that arrives a frame late is as visible as a theme that
 * does.
 */
export const THEME_BOOT_SCRIPT = `
(function(){
  var d = document.documentElement;
  try {
    var t = localStorage.getItem('${THEME_KEY}');
    if (t !== 'light' && t !== 'dark') t = '${DEFAULT_THEME}';
    d.setAttribute('data-theme', t);
    var s = localStorage.getItem('${SKIN_KEY}');
    if (${JSON.stringify(SKIN_IDS)}.indexOf(s) === -1) s = '${DEFAULT_SKIN}';
    d.setAttribute('data-skin', s);
  } catch (e) {
    d.setAttribute('data-theme', '${DEFAULT_THEME}');
    d.setAttribute('data-skin', '${DEFAULT_SKIN}');
  }
})();
`.trim();

export function getTheme(): Theme {
  if (typeof document === 'undefined') return DEFAULT_THEME;
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

export function setTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // private mode — the theme still applies for this session
  }
  window.dispatchEvent(new CustomEvent('themechange', { detail: theme }));
}

export function getSkin(): Skin {
  if (typeof document === 'undefined') return DEFAULT_SKIN;
  const s = document.documentElement.getAttribute('data-skin');
  return (SKIN_IDS as string[]).includes(s ?? '') ? (s as Skin) : DEFAULT_SKIN;
}

export function setSkin(skin: Skin) {
  document.documentElement.setAttribute('data-skin', skin);
  try {
    localStorage.setItem(SKIN_KEY, skin);
  } catch {
    // private mode — the accent still applies for this session
  }
  window.dispatchEvent(new CustomEvent('skinchange', { detail: skin }));
}
