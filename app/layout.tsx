import type { Metadata, Viewport } from 'next';
import './globals.css';
import { THEME_BOOT_SCRIPT, DEFAULT_THEME } from '@/lib/theme';
import PwaBoot from '@/components/PwaBoot';
import InstallPrompt from '@/components/InstallPrompt';

export const metadata: Metadata = {
  title: 'دستیار خودرو',
  description: 'درخواست خدمات خودرو، مدیریت مدارک و سوابق سرویس — برای مالک، تعمیرگاه و فروشنده',
  applicationName: 'دستیار خودرو',
  // Makes the site installable: the browser reads this for the app's name,
  // icons, colours and the standalone display mode.
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  // A phone number in a service listing should stay text, not become a link
  // the browser styles however it likes.
  formatDetection: { telephone: false, address: false, email: false },
  // Added to a home screen this behaves like an app rather than a browser tab.
  appleWebApp: { capable: true, title: 'دستیار خودرو', statusBarStyle: 'default' },
  openGraph: {
    type: 'website',
    locale: 'fa_IR',
    siteName: 'دستیار خودرو',
    title: 'دستیار خودرو',
    description: 'درخواست خدمات خودرو، مدیریت مدارک و سوابق سرویس',
  },
};

/* Matches whichever theme is painted, so the browser chrome doesn't fight the
   page. The value is corrected client-side by the boot script's sibling below. */
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0E1013' },
    { media: '(prefers-color-scheme: light)', color: '#F5F4F1' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" data-theme={DEFAULT_THEME} suppressHydrationWarning>
      <head>
        {/* Blocking, before first paint: no flash of the wrong theme. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        {/* IRANSans is served from this origin (see globals.css), so there is
            no third-party DNS lookup or handshake in front of first paint.

            These three faces cover almost every glyph on a first screen —
            body text, labels, and the bold weight the app leans on hardest.
            They are preloaded because @font-face rules inside the stylesheet
            are only discovered once it has parsed, which is exactly the delay
            that made the old setup slow. Black is deliberately left out: it
            appears in few places and would compete for the same bandwidth. */}
        <link rel="preload" as="font" type="font/woff2" href="/fonts/iransans/IRANSansWeb.woff2" crossOrigin="anonymous" />
        <link rel="preload" as="font" type="font/woff2" href="/fonts/iransans/IRANSansWeb_Medium.woff2" crossOrigin="anonymous" />
        <link rel="preload" as="font" type="font/woff2" href="/fonts/iransans/IRANSansWeb_Bold.woff2" crossOrigin="anonymous" />
      </head>
      <body style={{ minHeight: '100vh' }}>
        {children}
        <PwaBoot />
        <InstallPrompt />
      </body>
    </html>
  );
}
