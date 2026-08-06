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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ minHeight: '100vh' }}>{children}</body>
    </html>
  );
}
