export type Theme = 'dark' | 'light';

export const THEME_KEY = 'vtheme';

/** Dark is the product's identity, so it is the default: light is opt-in only,
 *  and the OS preference deliberately does not override that. */
export const DEFAULT_THEME: Theme = 'dark';

/**
 * Runs as a blocking inline script in <head>, before first paint, so a light
 * user never sees a dark flash (and vice versa). Kept as a string because it
 * has to execute before React hydrates.
 */
export const THEME_BOOT_SCRIPT = `
(function(){
  try {
    var t = localStorage.getItem('${THEME_KEY}');
    if (t !== 'light' && t !== 'dark') t = '${DEFAULT_THEME}';
    document.documentElement.setAttribute('data-theme', t);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', '${DEFAULT_THEME}');
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
