'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeIcon, CarIcon, PlusIcon, UserIcon, CalendarIcon, WrenchIcon, BoxIcon,
  BellIcon, UsersIcon, WalletIcon,
} from './icons';
import { C } from './ui';
import type { Role } from '@/lib/api';

interface Tab {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  /** matches when the current path is inside this tab's section, not just equal to it */
  match?: (path: string) => boolean;
}

/**
 * The tab bar used to show only Home and Profile to anyone who wasn't a car
 * owner, which left mechanics and sellers with no route to their own screens.
 *
 * Five slots is the most that stays legible on a phone, so they go to what each
 * role does regularly — recording, chasing what's due, and the books. The
 * marketplace screens (finding a workshop, publishing services) are one step
 * further in, from the dashboard and the profile menu, because they depend on
 * the provider network rather than on the user's own data.
 */
function tabsFor(role: Role): Tab[] {
  if (role === 'mechanic') {
    return [
      { href: '/mechanic', label: 'خانه', icon: HomeIcon },
      { href: '/appointments', label: 'نوبت‌ها', icon: CalendarIcon },
      { href: '/mechanic/customers', label: 'مشتری‌ها', icon: UsersIcon },
      { href: '/mechanic/accounting', label: 'حساب', icon: WalletIcon },
      { href: '/profile', label: 'پروفایل', icon: UserIcon },
    ];
  }
  if (role === 'seller') {
    return [
      { href: '/seller/products', label: 'محصولات', icon: BoxIcon },
      { href: '/seller/sales', label: 'فروش‌ها', icon: WrenchIcon },
      { href: '/seller/accounting', label: 'حساب', icon: WalletIcon },
      { href: '/profile', label: 'پروفایل', icon: UserIcon },
    ];
  }
  return [
    { href: '/dashboard', label: 'خانه', icon: HomeIcon },
    {
      href: '/vehicles',
      label: 'خودروها',
      icon: CarIcon,
      match: (p) => p.startsWith('/vehicles') && p !== '/vehicles/new',
    },
    { href: '/reminders', label: 'یادآورها', icon: BellIcon },
    { href: '/expenses', label: 'هزینه‌ها', icon: WalletIcon },
    { href: '/profile', label: 'پروفایل', icon: UserIcon },
  ];
}

export default function BottomNav() {
  const pathname = usePathname();
  const [role, setRole] = useState<Role>('owner');

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('vuser') || '{}');
      if (u.role === 'mechanic' || u.role === 'seller') setRole(u.role);
    } catch {}
  }, []);

  const tabs = tabsFor(role);
  /* the owner's "add a car" action stays a raised centre button rather than
     becoming another flat tab */
  const fabAfter = role === 'owner' ? 1 : -1;

  return (
    <nav
      style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
        display: 'flex', alignItems: 'center', justifyContent: 'space-around',
        height: 64,
        paddingBottom: 'env(safe-area-inset-bottom)',
        background: C.tabbarBg,
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderTop: `1px solid ${C.border}`,
        boxShadow: C.shadowTabbar,
      }}
    >
      {tabs.map((tab, i) => {
        const active = tab.match ? tab.match(pathname) : pathname === tab.href;
        const Icon = tab.icon;

        return (
          <div key={tab.href} style={{ display: 'contents' }}>
            <Link
              href={tab.href}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                color: active ? C.green : C.muted,
                textDecoration: 'none', width: 56, transition: 'color 0.15s',
              }}
            >
              <Icon size={21} strokeWidth={active ? 2 : 1.75} />
              <span style={{ fontSize: 10, fontWeight: active ? 800 : 600 }}>{tab.label}</span>
            </Link>

            {i === fabAfter && (
              <Link
                href="/vehicles/new"
                aria-label="افزودن خودرو"
                style={{
                  width: 52, height: 52, borderRadius: '50%',
                  background: `linear-gradient(135deg, ${C.green}, ${C.greenDark})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: C.onAccent, marginTop: -28,
                  boxShadow: `0 8px 24px ${C.greenGlow}, 0 2px 0 ${C.bg}`,
                  border: `4px solid ${C.bg}`,
                  flexShrink: 0,
                }}
              >
                <PlusIcon size={24} strokeWidth={2.25} />
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
