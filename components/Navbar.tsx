'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CarIcon } from './icons';
import { C } from './ui';
import NotificationsBell from './NotificationsBell';
import MessagesBell from './MessagesBell';
import ThemeToggle from './ThemeToggle';
import { homeHref } from '@/lib/session';

export default function Navbar({ title }: { title?: string }) {
  /* resolved after mount: the role lives in localStorage, which the server
     render can't see */
  const [home, setHome] = useState('/dashboard');
  useEffect(() => setHome(homeHref()), []);

  return (
    <header style={{
      background: C.navBg,
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      borderBottom: `1px solid ${C.border}`,
      position: 'sticky', top: 0, zIndex: 40,
      boxShadow: C.shadowNav,
    }}>
      <div style={{
        maxWidth: 560, margin: '0 auto',
        padding: '0 16px', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Link href={home} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          textDecoration: 'none', color: C.text,
          fontWeight: 900, fontSize: 15,
          fontFamily: 'var(--font-sans)',
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 11,
            background: `linear-gradient(135deg, ${C.green}, ${C.greenDark})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: C.onAccent,
            boxShadow: `0 4px 14px ${C.greenGlow}`,
          }}>
            <CarIcon size={18} />
          </div>
          {title ?? 'دستیار خودرو'}
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ThemeToggle />
          <MessagesBell />
          <NotificationsBell />
        </div>
      </div>
    </header>
  );
}
