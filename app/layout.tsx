import type { Metadata, Viewport } from 'next';
import './globals.css';
import { THEME_BOOT_SCRIPT, DEFAULT_THEME } from '@/lib/theme';

export const metadata: Metadata = {
  title: 'دستیار خودرو',
  description: 'مدیریت هوشمند خودرو و سوابق سرویس',
};

/* Matches whichever theme is painted, so the browser chrome doesn't fight the
   page. The value is corrected client-side by the boot script's sibling below. */
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0A1120' },
    { media: '(prefers-color-scheme: light)', color: '#0A1120' },
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
        {/* Rahbord feedback widget — whatever is written here becomes a task in
            https://rahbord.rahbit.ir. Lifted above the 64px BottomNav and put on
            the opposite side from the voice-agent bubble, which sits at
            inset-inline-end (the left, in RTL). */}
        <script
          src="https://rahbord.rahbit.ir/api/widget/embed.js"
          data-token="9lQFlVO2VQYyKo1EZJToOw"
          data-title="ثبت درخواست"
          data-color="#22C55E"
          data-side="right"
          data-bottom="88px"
          defer
        />
      </body>
    </html>
  );
}
