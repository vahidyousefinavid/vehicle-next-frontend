'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import { api, ExpenseSummary, toJalali } from '@/lib/api';
import { getToken } from '@/lib/session';
import {
  C, alpha, Card, SectionCard, EmptyState, Spinner, StatGrid, Money, MonthlyBars,
} from '@/components/ui';
import { ChevronRightIcon, WalletIcon, WrenchIcon, FuelIcon, CarIcon } from '@/components/icons';

export default function ExpensesPage() {
  const router = useRouter();
  const [data, setData] = useState<ExpenseSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) { router.replace('/'); return; }
    api.expenses.summary(6).then(setData).finally(() => setLoading(false));
  }, [router]);

  const empty = !data || data.total === 0;

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar title="هزینه‌ها" />
      <main style={{ maxWidth: 560, margin: '0 auto', padding: '0 14px calc(88px + env(safe-area-inset-bottom))' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: C.muted, fontSize: 13, fontWeight: 600, padding: '14px 0 10px', display: 'flex', alignItems: 'center', gap: 5 }}>
          <ChevronRightIcon size={16} /> بازگشت
        </button>

        {loading ? (
          <Spinner />
        ) : empty ? (
          <EmptyState
            icon={<WalletIcon size={26} />}
            title="هنوز هزینه‌ای ثبت نشده"
            sub="هزینه سرویس‌ها و سوخت‌گیری‌هات رو که ثبت کنی، اینجا جمعشون رو می‌بینی"
            onAdd={() => router.push('/vehicles')}
            btnLabel="رفتن به خودروها"
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <StatGrid stats={[
              { label: 'کل هزینه', value: `${(data!.total / 1_000_000).toFixed(1)}M`, sub: 'تومان', icon: <WalletIcon size={17} />, color: C.green },
              { label: 'سرویس', value: `${(data!.totalService / 1_000_000).toFixed(1)}M`, sub: 'تومان', icon: <WrenchIcon size={17} />, color: C.statusInfo },
              { label: 'سوخت', value: `${(data!.totalFuel / 1_000_000).toFixed(1)}M`, sub: 'تومان', icon: <FuelIcon size={17} />, color: C.statusDanger },
            ]} />

            {data!.monthly.length > 0 && (
              <SectionCard title="روند ۶ ماه اخیر" icon={<WalletIcon size={15} />}>
                <MonthlyBars
                  data={data!.monthly.map(m => ({ month: m.month, primary: m.service, secondary: m.fuel }))}
                  primaryLabel="سرویس"
                  secondaryLabel="سوخت"
                />
              </SectionCard>
            )}

            {data!.byVehicle.length > 0 && (
              <SectionCard title="به تفکیک خودرو" icon={<CarIcon size={15} />}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {data!.byVehicle.map(v => {
                    const share = data!.total > 0 ? (v.total / data!.total) * 100 : 0;
                    return (
                      <div key={v.vehicleId}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
                          <span style={{ fontSize: 12.5, fontWeight: 700, color: C.text }}>
                            {v.label}
                            {v.plateNumber && <span style={{ color: C.subtle, fontWeight: 500, marginRight: 6 }}>{v.plateNumber}</span>}
                          </span>
                          <Money amount={v.total} size={13} />
                        </div>
                        <div style={{ height: 6, background: C.fill2, borderRadius: 6, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${share}%`, background: C.green, borderRadius: 6 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </SectionCard>
            )}

            {data!.recent.length > 0 && (
              <SectionCard title="آخرین هزینه‌ها" icon={<WalletIcon size={15} />}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {data!.recent.map((r, i) => {
                    const isFuel = r.kind === 'fuel';
                    const color = isFuel ? C.statusDanger : C.statusInfo;
                    return (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 11, padding: '9px 0',
                        borderBottom: i === data!.recent.length - 1 ? 'none' : `1px solid ${C.border}`,
                      }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 11, flexShrink: 0,
                          background: alpha(color, 12), color,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>{isFuel ? <FuelIcon size={15} /> : <WrenchIcon size={15} />}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 12.5, fontWeight: 700, color: C.text, margin: 0 }}>{r.label}</p>
                          <p style={{ fontSize: 10.5, color: C.subtle, margin: '2px 0 0' }}>
                            {r.vehicleName} · {toJalali(r.date)}
                          </p>
                        </div>
                        <Money amount={r.amount} size={12.5} />
                      </div>
                    );
                  })}
                </div>
              </SectionCard>
            )}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
