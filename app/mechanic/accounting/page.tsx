'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import { api, MechanicAccounting, toJalali } from '@/lib/api';
import { getToken, getUser, homeHref } from '@/lib/session';
import {
  C, alpha, Card, SectionCard, EmptyState, Spinner, StatGrid, Money, MonthlyBars,
} from '@/components/ui';
import {
  ChevronRightIcon, WalletIcon, CheckIcon, AlertTriangleIcon, PhoneIcon, WrenchIcon,
} from '@/components/icons';

export default function MechanicAccountingPage() {
  const router = useRouter();
  const [data, setData] = useState<MechanicAccounting | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) { router.replace('/'); return; }
    const u = getUser();
    if (u && u.role !== 'mechanic') { router.replace(homeHref(u.role)); return; }
    api.mechanic.accounting(6).then(setData).finally(() => setLoading(false));
  }, [router]);

  const empty = !data || data.lifetimeInvoiced === 0;

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
            title="هنوز فاکتوری ثبت نشده"
            sub="برای هر سرویسی که ثبت می‌کنی فاکتور بزن تا درآمد و مانده حساب مشتری‌هات اینجا جمع بشه"
            onAdd={() => router.push('/mechanic')}
            btnLabel="رفتن به خودروها"
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <StatGrid stats={[
              { label: 'کل صورتحساب', value: `${(data!.lifetimeInvoiced / 1_000_000).toFixed(1)}M`, sub: 'تومان', icon: <WalletIcon size={17} />, color: C.green },
              { label: 'دریافت‌شده', value: `${(data!.lifetimeCollected / 1_000_000).toFixed(1)}M`, sub: 'تومان', icon: <CheckIcon size={17} />, color: C.statusMint },
              { label: 'مانده', value: `${(data!.outstanding / 1_000_000).toFixed(1)}M`, sub: 'تومان', icon: <AlertTriangleIcon size={17} />, color: data!.outstanding > 0 ? C.statusWarn : C.muted },
            ]} />

            {data!.monthly.length > 0 && (
              <SectionCard title="درآمد ۶ ماه اخیر" icon={<WalletIcon size={15} />}>
                <MonthlyBars
                  data={data!.monthly.map(m => ({ month: m.month, primary: m.invoiced, secondary: m.collected }))}
                  primaryLabel="صورتحساب"
                  secondaryLabel="دریافتی"
                />
              </SectionCard>
            )}

            {data!.unpaidInvoices.length > 0 && (
              <div>
                <h2 style={{ color: C.text2, fontSize: 13, fontWeight: 700, margin: '0 0 9px' }}>
                  فاکتورهای تسویه‌نشده <span style={{ color: C.subtle, fontWeight: 600 }}>({data!.unpaidCount})</span>
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {data!.unpaidInvoices.map(inv => (
                    <Card key={inv.invoiceId} padding="12px 14px">
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: 11, flexShrink: 0,
                          background: alpha(C.statusWarn, 12), border: `1px solid ${alpha(C.statusWarn, 25)}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.statusWarn,
                        }}><WrenchIcon size={16} /></div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 12.5, fontWeight: 800, color: C.text, margin: 0 }}>
                            {inv.customerName}
                          </p>
                          <p style={{ fontSize: 10.5, color: C.subtle, margin: '3px 0 0' }}>
                            {inv.serviceType} · {inv.vehicle}
                            {inv.plateNumber ? ` · ${inv.plateNumber}` : ''}
                          </p>
                          <p style={{ fontSize: 10.5, color: C.subtle, margin: '2px 0 0' }}>
                            {toJalali(inv.serviceDate)}
                          </p>
                          {inv.customerPhone && (
                            <a href={`tel:${inv.customerPhone}`} style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6,
                              fontSize: 10.5, fontWeight: 700, color: C.green, textDecoration: 'none', direction: 'ltr',
                            }}>
                              <PhoneIcon size={11} /> {inv.customerPhone}
                            </a>
                          )}
                        </div>

                        <div style={{ textAlign: 'left', flexShrink: 0 }}>
                          <Money amount={inv.remaining} color={C.statusWarn} size={13} />
                          {inv.paid > 0 && (
                            <p style={{ fontSize: 10, color: C.subtle, margin: '3px 0 0', whiteSpace: 'nowrap' }}>
                              از {Math.round(inv.total).toLocaleString('fa-IR')}
                            </p>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
                <p style={{ fontSize: 11, color: C.subtle, margin: '10px 0 0', lineHeight: 1.7 }}>
                  برای تسویه، فاکتور رو از صفحه سرویس همان خودرو ویرایش کن.
                </p>
              </div>
            )}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
