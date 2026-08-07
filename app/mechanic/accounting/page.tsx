'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import InvoicesManager from '@/components/InvoicesManager';
import { api, MechanicAccounting, toJalali } from '@/lib/api';
import { getToken, getUser, homeHref } from '@/lib/session';
import {
  C, alpha, Card, SectionCard, Button, Spinner, StatGrid, Money, MonthlyBars,
} from '@/components/ui';
import {
  ChevronRightIcon, WalletIcon, CheckIcon, AlertTriangleIcon, PhoneIcon, WrenchIcon,
} from '@/components/icons';

export default function MechanicAccountingPage() {
  const router = useRouter();
  const [data, setData] = useState<MechanicAccounting | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSummary = useCallback(() => {
    api.mechanic.accounting(6).then(setData).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!getToken()) { router.replace('/'); return; }
    const u = getUser();
    if (u && u.role !== 'mechanic') { router.replace(homeHref(u.role)); return; }
    loadSummary();
  }, [router, loadSummary]);

  /* The books above summarise *approved* revenue, so they stay hidden until there is any.
     The invoice list below does not: a workshop whose bills are all still awaiting the
     customer had nothing at all on this screen before, which is exactly when it needs one. */
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
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {empty && (
              <p style={{ fontSize: 11.5, color: C.subtle, margin: 0, lineHeight: 1.8 }}>
                هنوز درآمد تأییدشده‌ای ثبت نشده. فاکتورهایی که صادر می‌کنی اینجا فهرست می‌شوند و
                بعد از تأیید مشتری، به درآمد و نمودارها اضافه می‌شوند.
              </p>
            )}
            {!empty && (
          <>
            <StatGrid stats={[
              { label: 'درآمد تأییدشده', value: `${(data!.lifetimeInvoiced / 1_000_000).toFixed(1)}M`, sub: 'تومان', icon: <WalletIcon size={17} />, color: C.green },
              { label: 'وصول‌شده', value: `${(data!.lifetimeCollected / 1_000_000).toFixed(1)}M`, sub: 'تومان', icon: <CheckIcon size={17} />, color: C.statusMint },
              { label: 'مانده مطالبات', value: `${(data!.outstanding / 1_000_000).toFixed(1)}M`, sub: 'تومان', icon: <AlertTriangleIcon size={17} />, color: data!.outstanding > 0 ? C.statusWarn : C.muted },
            ]} />

            {/* Revenue on its own says nothing about whether the workshop made money. Profit
                is stated outright, and coloured, so a loss cannot be mistaken for a good
                month at a glance. */}
            <Card
              padding="14px 16px"
              style={{ marginBottom: 14, borderInlineStart: `3px solid ${data!.profit >= 0 ? C.green : C.statusExpired}` }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <p style={{ fontSize: 11.5, color: C.muted, margin: 0, fontWeight: 600 }}>
                    {data!.profit >= 0 ? 'سود' : 'زیان'}
                  </p>
                  <p style={{ fontSize: 22, fontWeight: 800, margin: '4px 0 0', color: data!.profit >= 0 ? C.green : C.statusExpired }}>
                    {Math.abs(Math.round(data!.profit)).toLocaleString('fa-IR')}
                    <span style={{ fontSize: 12, fontWeight: 600, color: C.muted }}> تومان</span>
                  </p>
                  <p style={{ fontSize: 10.5, color: C.subtle, margin: '5px 0 0' }}>
                    درآمد تأییدشده منهای هزینه‌های تعمیرگاه
                  </p>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>هزینه‌ها</p>
                  <p style={{ fontSize: 14, fontWeight: 800, color: C.statusExpired, margin: '3px 0 0' }}>
                    {Math.round(data!.expenses.lifetime).toLocaleString('fa-IR')} ت
                  </p>
                  <Button size="sm" variant="secondary" onClick={() => router.push('/mechanic/expenses')} style={{ marginTop: 8 }}>
                    مدیریت هزینه‌ها
                  </Button>
                </div>
              </div>

              {data!.expenses.byCategory.length > 0 && (
                <div style={{ marginTop: 12, paddingTop: 11, borderTop: `1px solid ${alpha(C.text2, 12)}`, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {data!.expenses.byCategory.slice(0, 5).map(c => {
                    const pct = data!.expenses.lifetime > 0 ? (c.amount / data!.expenses.lifetime) * 100 : 0;
                    return (
                      <div key={c.key}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: C.text2, marginBottom: 3 }}>
                          <span>{c.label}</span>
                          <span style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{Math.round(c.amount).toLocaleString('fa-IR')} ت</span>
                        </div>
                        <div style={{ height: 4, borderRadius: 3, background: alpha(C.text2, 10), overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: C.statusExpired, opacity: .7 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Money that is billed but not yet accepted is deliberately kept out of the
                revenue figures above — showing it here is what stops it from simply
                disappearing from the mechanic's view. */}
            {(data!.awaitingApproval.count > 0 || data!.rejected.count > 0) && (
              <div style={{ display: 'flex', gap: 9, marginBottom: 14, flexWrap: 'wrap' }}>
                {data!.awaitingApproval.count > 0 && (
                  <Card padding="11px 13px" style={{ flex: 1, minWidth: 150, borderInlineStart: `3px solid ${C.statusWarn}` }}>
                    <p style={{ fontSize: 11, color: C.muted, margin: 0, fontWeight: 600 }}>
                      در انتظار تأیید مشتری ({data!.awaitingApproval.count})
                    </p>
                    <p style={{ fontSize: 15, fontWeight: 800, color: C.statusWarn, margin: '3px 0 0' }}>
                      {Math.round(data!.awaitingApproval.amount).toLocaleString('fa-IR')} ت
                    </p>
                    <p style={{ fontSize: 10, color: C.subtle, margin: '4px 0 0' }}>تا تأیید نشود درآمد حساب نمی‌شود</p>
                  </Card>
                )}
                {data!.rejected.count > 0 && (
                  <Card padding="11px 13px" style={{ flex: 1, minWidth: 150, borderInlineStart: `3px solid ${C.statusExpired}` }}>
                    <p style={{ fontSize: 11, color: C.muted, margin: 0, fontWeight: 600 }}>
                      ردشده توسط مشتری ({data!.rejected.count})
                    </p>
                    <p style={{ fontSize: 15, fontWeight: 800, color: C.statusExpired, margin: '3px 0 0' }}>
                      {Math.round(data!.rejected.amount).toLocaleString('fa-IR')} ت
                    </p>
                    <p style={{ fontSize: 10, color: C.subtle, margin: '4px 0 0' }}>نیاز به اصلاح فاکتور دارد</p>
                  </Card>
                )}
              </div>
            )}

            {/* What the revenue above is actually made of. A single total cannot answer
                "چقدرش اجرت بود و چقدرش قطعه" — and that is the question that decides pricing. */}
            {data!.lifetimeInvoiced > 0 && (
              <SectionCard title="تفکیک درآمد" icon={<WalletIcon size={15} />}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 12.5, color: C.text2 }}>
                  {([
                    ['اجرت خدمات', data!.breakdown.labor, C.green],
                    ['قطعات و مصرفی', data!.breakdown.parts, C.statusInfo],
                    ['تخفیف داده‌شده', -data!.breakdown.discount, C.statusMint],
                    ['ارزش افزوده', data!.breakdown.tax, C.muted],
                  ] as [string, number, string][]).filter(([, v]) => v !== 0).map(([label, value, color]) => {
                    const base = data!.breakdown.labor + data!.breakdown.parts || 1;
                    const pct = Math.min(100, Math.abs(value) / base * 100);
                    return (
                      <div key={label}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 3 }}>
                          <span>{label}</span>
                          <span style={{ fontWeight: 700, whiteSpace: 'nowrap', color }}>
                            {Math.round(value).toLocaleString('fa-IR')} ت
                          </span>
                        </div>
                        <div style={{ height: 4, borderRadius: 3, background: alpha(C.text2, 10), overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: color, opacity: .75 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </SectionCard>
            )}

            {data!.monthly.length > 0 && (
              <SectionCard title="درآمد ۶ ماه اخیر" icon={<WalletIcon size={15} />}>
                <MonthlyBars
                  data={data!.monthly.map(m => ({ month: m.month, primary: m.invoiced, secondary: m.collected }))}
                  primaryLabel="صورتحساب"
                  secondaryLabel="دریافتی"
                />
              </SectionCard>
            )}

            </>
            )}

            {/* The full invoice book — view, issue, edit, take payment, delete. */}
            <InvoicesManager onChanged={loadSummary} />

            {!empty && data!.unpaidInvoices.length > 0 && (
              <div>
                <h2 style={{ color: C.text2, fontSize: 13, fontWeight: 700, margin: '0 0 4px' }}>
                  مطالبات وصول‌نشده <span style={{ color: C.subtle, fontWeight: 600 }}>({data!.unpaidCount})</span>
                </h2>
                <p style={{ fontSize: 11, color: C.subtle, margin: '0 0 9px', lineHeight: 1.7 }}>
                  فاکتورهای تأییدشده‌ای که هنوز کامل وصول نشده‌اند. برای ثبت دریافت، روی هر مورد بزنید.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {data!.unpaidInvoices.map(inv => (
                    <Card
                      key={inv.invoiceId}
                      padding="12px 14px"
                      onClick={() => router.push(`/mechanic/vehicles/${inv.vehicleId}?record=${inv.recordId}`)}
                      ariaLabel={`ثبت دریافت برای ${inv.customerName}`}
                      style={{ cursor: 'pointer' }}
                    >
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
                          {inv.invoiceNumber && (
                            <p style={{ fontSize: 10, color: C.subtle, margin: '2px 0 0', fontWeight: 700 }}>
                              فاکتور {inv.invoiceNumber}
                            </p>
                          )}
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

              </div>
            )}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
