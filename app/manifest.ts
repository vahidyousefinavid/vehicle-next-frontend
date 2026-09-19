import type { MetadataRoute } from 'next';

/**
 * Served at /manifest.webmanifest — this is what makes the site installable.
 *
 * `start_url` is the landing page on purpose: it redirects a signed-in person
 * straight to their own home, so the installed app opens on the dashboard for
 * anyone with a session and on the front page for anyone without one.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'دستیار خودرو',
    short_name: 'دستیار خودرو',
    description: 'درخواست خدمات خودرو، مدیریت مدارک و سوابق سرویس',
    lang: 'fa',
    dir: 'rtl',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0E1013',
    // The colour of the title bar in an installed window. It has to match the
    // page behind it, not the brand swatch — an amber bar above a graphite
    // page reads as two apps stitched together. Dark is the default theme, so
    // this is the graphite canvas.
    theme_color: '#0E1013',
    categories: ['auto', 'productivity'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'خدمات', short_name: 'خدمات', url: '/dashboard' },
      { name: 'نوبت‌ها', short_name: 'نوبت‌ها', url: '/appointments' },
      { name: 'خودروهای من', short_name: 'خودروها', url: '/vehicles' },
    ],
  };
}
