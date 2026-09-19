'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeIcon, CarIcon, PlusIcon, UserIcon, CalendarIcon, WrenchIcon, BoxIcon,
  BellIcon, UsersIcon, WalletIcon,
} from './icons';
import { C, alpha } from './ui';
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
      { href: '/seller', label: 'خانه', icon: HomeIcon },
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
      className="tabbar"
      style={{
        background: C.tabbarBg,
        boxShadow: C.shadowLift,
      }}
    >
      {tabs.map((tab, i) => {
        const active = tab.match ? tab.match(pathname) : pathname === tab.href;
        const Icon = tab.icon;

        return (
          <div key={tab.href} style={{ display: 'contents' }}>
            <Link
              href={tab.href}
              className={`tab ${active ? 'on' : ''}`}
              style={{ color: active ? C.green : C.muted }}
            >
              <span className="tab-ico" style={{ background: active ? alpha(C.green, 12) : 'transparent' }}>
                <Icon size={20} strokeWidth={active ? 2 : 1.75} />
              </span>
              <span className="tab-label" style={{ fontWeight: active ? 900 : 700 }}>{tab.label}</span>
            </Link>

            {i === fabAfter && (
              <Link
                href="/vehicles/new"
                aria-label="افزودن خودرو"
                className="tab-fab"
                style={{
                  background: `linear-gradient(135deg, ${C.green}, ${C.greenDark})`,
                  color: C.onAccent,
                  boxShadow: `0 12px 26px -8px ${C.greenGlow}`,
                  border: 'none',
                }}
              >
                <PlusIcon size={24} strokeWidth={2.25} />
              </Link>
            )}
          </div>
        );
      })}

      <style>{`
.tabbar{position:fixed;bottom:calc(10px + env(safe-area-inset-bottom));left:12px;right:12px;z-index:40;display:flex;align-items:center;justify-content:space-around;height:64px;border-radius:22px;backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px)}
@media(min-width:720px){.tabbar{max-width:520px;margin:0 auto}}
.tab{display:flex;flex-direction:column;align-items:center;gap:2px;text-decoration:none;width:58px;transition:color .15s ease}
.tab-ico{width:38px;height:30px;border-radius:12px;display:grid;place-items:center;transition:background .18s ease}
.tab-label{font-size:10px}
.tab-fab{width:52px;height:52px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin-top:-30px;flex-shrink:0;transition:transform .18s cubic-bezier(.16,1,.3,1)}
.tab-fab:active{transform:scale(.94)}
      `}</style>
    </nav>
  );
}
