'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import { api, SellerAccounting, SellerCustomer, toJalali } from '@/lib/api';
import { getToken, getUser, homeHref } from '@/lib/session';
import {
  C, alpha, Card, SectionCard, EmptyState, Spinner, StatGrid, Money, MonthlyBars,
} from '@/components/ui';
import {
  ChevronRightIcon, WalletIcon, CheckIcon, AlertTriangleIcon, BoxIcon, UsersIcon, PhoneIcon,
} from '@/components/icons';

export default function SellerAccountingPage() {
  const router = useRouter();
  const [data, setData] = useState<SellerAccounting | null>(null);
  const [customers, setCustomers] = useState<SellerCustomer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) { router.replace('/'); return; }
    const u = getUser();
    if (u && u.role !== 'seller') { router.replace(homeHref(u.role)); return; }
    Promise.all([api.sales.accounting(6), api.sales.customers()])
      .then(([acc, cust]) => { setData(acc); setCustomers(cust); })
      .finally(() => setLoading(false));
  }, [router]);

  const empty = !data || data.lifetimeSold === 0;

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar title="حسابداری" />
      <main style={{ maxWidth: 560, margin: '0 auto', padding: '0 14px calc(88px + env(safe-area-inset-bottom))' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: C.muted, fontSize: 13, fontWeight: 600, padding: '14px 0 10px', display: 'flex', alignItems: 'center', gap: 5 }}>
          <ChevronRightIcon size={16} /> بازگشت
        </button>

        {loading ? (
          <Spinner />
        ) : empty ? (
          <EmptyState
            icon={<WalletIcon size={26} />}
            title="هنوز فروشی ثبت نشده"
            sub="با ثبت فروش‌ها، درآمد، طلب‌های وصول‌نشده و مشتری‌هات اینجا جمع می‌شه"
            onAdd={() => router.push('/seller/sales')}
            btnLabel="ثبت فروش"
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <StatGrid stats={[
              { label: 'کل فروش', value: `${(data!.lifetimeSold / 1_000_000).toFixed(1)}M`, sub: 'تومان', icon: <WalletIcon size={17} />, color: C.green },
              { label: 'وصول‌شده', value: `${(data!.lifetimeCollected / 1_000_000).toFixed(1)}M`, sub: 'تومان', icon: <CheckIcon size={17} />, color: C.statusMint },
              { label: 'طلب', value: `${(data!.outstanding / 1_000_000).toFixed(1)}M`, sub: 'تومان', icon: <AlertTriangleIcon size={17} />, color: data!.outstanding > 0 ? C.statusWarn : C.muted },
            ]} />

            {data!.monthly.length > 0 && (
              <SectionCard title="فروش ۶ ماه اخیر" icon={<WalletIcon size={15} />}>
                <MonthlyBars
                  data={data!.monthly.map(m => ({ month: m.month, primary: m.sold, secondary: m.collected }))}
                  primaryLabel="فروش"
                  secondaryLabel="وصولی"
                />
              </SectionCard>
            )}

            {/* Stock is the other number a seller watches daily, and it only
                stays honest because every sale deducts from it. */}
            {data!.lowStock.length > 0 && (
              <SectionCard title="موجودی رو به اتمام" icon={<BoxIcon size={15} />}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {data!.lowStock.map((p, i) => (
                    <div key={p.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0',
                      borderBottom: i === data!.lowStock.length - 1 ? 'none' : `1px solid ${C.border}`,
                    }}>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: C.text }}>{p.name}</span>
                      <span style={{
                        fontSize: 11, fontWeight: 800,
                        color: p.stock <= 0 ? C.statusExpired : C.statusWarn,
                        background: alpha(p.stock <= 0 ? C.statusExpired : C.statusWarn, 12),
                        padding: '3px 10px', borderRadius: 8,
                      }}>
                        {p.stock <= 0 ? 'ناموجود' : `${p.stock} ${p.unit}`}
                      </span>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {customers.length > 0 && (
              <SectionCard title="مشتری‌ها" icon={<UsersIcon size={15} />}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {customers.map((c, i) => (
                    <div key={c.key} style={{
                      display: 'flex', alignItems: 'center', gap: 11, padding: '10px 0',
                      borderBottom: i === customers.length - 1 ? 'none' : `1px solid ${C.border}`,
                    }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: 11, flexShrink: 0,
                        background: alpha(C.green, 12), color: C.green,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 900, fontSize: 13,
                      }}>{c.name.trim().charAt(0) || '؟'}</div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12.5, fontWeight: 800, color: C.text, margin: 0 }}>{c.name}</p>
                        <p style={{ fontSize: 10.5, color: C.subtle, margin: '2px 0 0' }}>
                          {c.purchaseCount} خرید
                          {c.lastPurchase ? ` · آخرین: ${toJalali(c.lastPurchase)}` : ''}
                        </p>
                        {c.phone && (
                          <a href={`tel:${c.phone}`} style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4,
                            fontSize: 10.5, fontWeight: 700, color: C.green, textDecoration: 'none', direction: 'ltr',
                          }}>
                            <PhoneIcon size={11} /> {c.phone}
                          </a>
                        )}
                      </div>

                      <div style={{ textAlign: 'left', flexShrink: 0 }}>
                        <Money amount={c.totalSpent} size={12.5} compact />
                        {c.outstanding > 0 && (
                          <p style={{ fontSize: 10, fontWeight: 700, color: C.statusWarn, margin: '3px 0 0', whiteSpace: 'nowrap' }}>
                            بدهی: {Math.round(c.outstanding).toLocaleString('fa-IR')}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {data!.unpaidSales.length > 0 && (
              <Card accentColor={C.statusWarn}>
                <p style={{ fontSize: 13, fontWeight: 800, color: C.text, margin: '0 0 4px' }}>
                  {data!.unpaidCount} فروش تسویه‌نشده
                </p>
                <p style={{ fontSize: 11.5, color: C.muted, margin: 0, lineHeight: 1.7 }}>
                  از صفحه فروش‌ها می‌تونی پرداخت هرکدوم رو ثبت کنی.
                </p>
              </Card>
            )}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
