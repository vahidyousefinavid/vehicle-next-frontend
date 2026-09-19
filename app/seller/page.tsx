'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import ThemeToggle from '@/components/ThemeToggle';
import NotificationsBell from '@/components/NotificationsBell';
import { api, Sale, SellerAccounting, User } from '@/lib/api';
import { getToken, getUser, homeHref } from '@/lib/session';
import { C, alpha, EmptyState, SkeletonRow } from '@/components/ui';
import { RoleGreeting, HeroStat, QueueCard, ToolRow, SectionHead, ROLE_HOME_CSS, fa } from '@/components/RoleHome';
import {
  BoxIcon, ChevronLeftIcon, MessageIcon, SparklesIcon, StoreIcon,
  UsersIcon, WalletIcon, AlertTriangleIcon, PlusIcon,
} from '@/components/icons';

/**
 * The seller's home.
 *
 * Sellers used to land straight on a product list — a screen that says what
 * they own but nothing about how the shop is doing, and never tells them what
 * needs attention. This leads with money taken, then the two things that cost
 * them if ignored: unpaid sales and stock about to run out.
 */
export default function SellerHome() {
  const router = useRouter();
  const [shop, setShop] = useState<User | null>(null);
  const [acc, setAcc] = useState<SellerAccounting | null>(null);
  const [recent, setRecent] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) { router.replace('/'); return; }
    const u = getUser();
    if (u && u.role !== 'seller') { router.replace(homeHref(u.role)); return; }
    if (u) setShop(u);
    Promise.all([
      api.sales.accounting(6).catch(() => null),
      api.sales.list().catch(() => [] as Sale[]),
    ]).then(([a, s]) => { setAcc(a); setRecent(s.slice(0, 5)); })
      .finally(() => setLoading(false));
  }, [router]);

  const thisMonth = acc?.monthly?.[acc.monthly.length - 1];
  const outstanding = acc?.outstanding ?? 0;
  const lowStock = acc?.lowStock ?? [];

  return (
    <div className="sell" data-density="dense">
      <main className="sell-main">
        <RoleGreeting
          eyebrow="فروشگاه من"
          title={shop?.workshopName || shop?.name || 'فروشگاه'}
          subtitle={outstanding > 0 ? 'چند فاکتور هنوز تسویه نشده' : 'حساب‌ها تسویه است'}
          right={<>
            <NotificationsBell />
            <ThemeToggle size={38} />
            <Link href="/profile" className="sell-avatar" style={{ background: `linear-gradient(135deg, ${C.green}, ${C.greenDark})`, color: C.onAccent }}>
              {(shop?.workshopName || shop?.name || 'ف').trim().slice(0, 1)}
            </Link>
          </>}
        />

        <HeroStat
          label="فروش این ماه"
          value={thisMonth?.sold ? fa(thisMonth.sold) : '—'}
          unit={thisMonth?.sold ? 'تومان' : undefined}
          note={thisMonth?.sold ? undefined : 'اولین فروشت را ثبت کن تا اینجا دیده شود'}
          tone={C.statusOk}
          side={[
            { label: 'فاکتور این ماه', value: fa(thisMonth?.count ?? 0) },
            { label: 'وصول‌نشده', value: outstanding ? fa(outstanding) : '۰', tone: outstanding ? C.statusExpired : undefined },
          ]}
        />

        {(acc?.unpaidCount ?? 0) > 0 && (
          <QueueCard
            icon={<WalletIcon size={20} />}
            title={`${fa(acc!.unpaidCount)} فاکتور تسویه‌نشده`}
            body={`${fa(outstanding)} تومان هنوز از مشتری‌ها طلب داری`}
            cta="پیگیری"
            href="/seller/accounting"
            tone={C.statusExpired}
          />
        )}
        {lowStock.length > 0 && (
          <QueueCard
            icon={<AlertTriangleIcon size={20} />}
            title={`${fa(lowStock.length)} کالا رو به اتمام`}
            body={lowStock.slice(0, 2).map((p) => `${p.name} (${fa(p.stock)} ${p.unit})`).join('، ')}
            cta="انبار"
            href="/seller/products"
          />
        )}

        <SectionHead title="ابزارهای فروشگاه" />
        <ToolRow tools={[
          { href: '/seller/products',   label: 'محصولات', hint: 'کالا و موجودی', icon: <BoxIcon size={19} />,     hue: 'var(--svc-tire)' },
          { href: '/seller/sales',      label: 'فروش‌ها', hint: 'ثبت و سوابق',   icon: <StoreIcon size={19} />,   hue: 'var(--svc-oil)' },
          { href: '/seller/accounting', label: 'حساب‌وکتاب', hint: 'درآمد و طلب', icon: <WalletIcon size={19} />, hue: 'var(--svc-gearbox)' },
          { href: '/messages',          label: 'گفتگوها', hint: 'با مشتری',      icon: <MessageIcon size={19} />, hue: 'var(--svc-ac)' },
        ]} />

        <SectionHead title="آخرین فروش‌ها" action={{ label: 'همه', href: '/seller/sales' }} />
        {loading ? (
          <div style={{ background: C.surfaceSolid, borderRadius: 20, overflow: 'hidden' }}><SkeletonRow /><SkeletonRow /></div>
        ) : recent.length === 0 ? (
          <EmptyState
            icon={<StoreIcon size={26} />}
            title="هنوز فروشی ثبت نشده"
            sub="اولین فاکتورت را ثبت کن تا درآمد و طلب اینجا جمع شود"
            onAdd={() => router.push('/seller/sales')}
            btnLabel="ثبت فروش"
          />
        ) : (
          <div className="sell-list">
            {recent.map((s) => {
              const total = (s.items || []).reduce((n, i) => n + i.quantity * i.unitPrice, 0);
              const owed = Math.max(0, total - (s.discount || 0) - (s.paidAmount || 0));
              return (
                <Link key={s.id} href="/seller/sales" className="sell-row" style={{ background: C.surfaceSolid, boxShadow: C.shadowSoft }}>
                  <span style={{ background: alpha(owed ? C.statusExpired : C.statusOk, 11), color: owed ? C.statusExpired : C.statusOk }}>
                    <StoreIcon size={19} />
                  </span>
                  <div>
                    <b style={{ color: C.textStrong }}>{s.customerName || 'مشتری حضوری'}</b>
                    <small style={{ color: C.muted }}>{s.soldAt} · {fa((s.items || []).length)} قلم</small>
                  </div>
                  <em className="rh-fig" style={{ color: owed ? C.statusExpired : C.textStrong }}>
                    {fa(total)}
                    {owed > 0 && <i style={{ color: C.statusExpired }}>{fa(owed)} مانده</i>}
                  </em>
                </Link>
              );
            })}
          </div>
        )}

        <Link href="/seller/products" className="sell-cta" style={{ background: `linear-gradient(135deg, ${C.green}, ${C.greenDark})`, boxShadow: C.shadowBrand }}>
          <span><SparklesIcon size={22} /></span>
          <div>
            <b>کالای آماده اضافه کن</b>
            <p>از کاتالوگ آماده، ده‌ها کالای پرفروش را یکجا وارد فروشگاهت کن.</p>
          </div>
          <i><PlusIcon size={18} /></i>
        </Link>
      </main>

      <BottomNav />

      <style>{ROLE_HOME_CSS + `
.sell{min-height:100vh;background:var(--bg-gradient)}
.sell-main{max-width:640px;margin:0 auto;padding:8px 16px calc(104px + env(safe-area-inset-bottom))}
.sell-avatar{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;font:900 17px var(--font-sans);text-decoration:none;flex-shrink:0}
.sell-list{display:grid;gap:10px}
.sell-row{display:flex;align-items:center;gap:12px;border-radius:18px;padding:12px 13px;text-decoration:none;transition:transform .16s ease}
.sell-row:hover{transform:translateY(-2px)}
.sell-row>span{width:42px;height:42px;border-radius:15px;display:grid;place-items:center;flex-shrink:0}
.sell-row>div{flex:1;min-width:0}
.sell-row b{display:block;font-size:13.5px;font-weight:900}
.sell-row small{display:block;font-size:11px;margin-top:3px}
.sell-row em{font-style:normal;text-align:left;font-size:13.5px;font-weight:900;flex-shrink:0}
.sell-row em i{display:block;font-style:normal;font-size:10.5px;font-weight:800;margin-top:2px}
.sell-cta{display:flex;align-items:center;gap:13px;border-radius:22px;padding:16px;text-decoration:none;color:#fff;margin-top:22px}
.sell-cta>span{width:50px;height:50px;border-radius:17px;background:rgba(255,255,255,.18);display:grid;place-items:center;flex-shrink:0}
.sell-cta>div{flex:1;min-width:0}
.sell-cta b{font-size:14.5px;font-weight:950;display:block}
.sell-cta p{font-size:11.5px;line-height:1.7;margin:4px 0 0;opacity:.92}
.sell-cta i{font-style:normal;width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.20);display:grid;place-items:center;flex-shrink:0}
      `}</style>
    </div>
  );
}
