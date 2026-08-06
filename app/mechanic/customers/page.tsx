'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import { api, MechanicCustomer, toJalali } from '@/lib/api';
import { getToken, getUser, homeHref } from '@/lib/session';
import { C, alpha, Card, Input, EmptyState, Spinner, Money } from '@/components/ui';
import { ChevronRightIcon, UsersIcon, CarIcon, PhoneIcon, SearchIcon } from '@/components/icons';

export default function MechanicCustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<MechanicCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  useEffect(() => {
    if (!getToken()) { router.replace('/'); return; }
    const u = getUser();
    if (u && u.role !== 'mechanic') { router.replace(homeHref(u.role)); return; }
    api.mechanic.customers().then(setCustomers).finally(() => setLoading(false));
  }, [router]);

  const term = q.trim();
  const shown = term
    ? customers.filter(c =>
        c.name.includes(term) ||
        (c.phone ?? '').includes(term) ||
        c.vehicles.some(v => v.label.includes(term) || (v.plateNumber ?? '').includes(term)))
    : customers;

  const owing = customers.filter(c => c.outstanding > 0);

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar title="مشتری‌ها" />
      <main style={{ maxWidth: 560, margin: '0 auto', padding: '0 14px calc(88px + env(safe-area-inset-bottom))' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: C.muted, fontSize: 13, fontWeight: 600, padding: '14px 0 10px', display: 'flex', alignItems: 'center', gap: 5 }}>
          <ChevronRightIcon size={16} /> بازگشت
        </button>

        {loading ? (
          <Spinner />
        ) : customers.length === 0 ? (
          <EmptyState
            icon={<UsersIcon size={26} />}
            title="هنوز مشتری‌ای ثبت نشده"
            sub="هر ماشینی که با پلاک اضافه کنی یا با کد دعوت وصل بشه، مشتریش اینجا ثبت می‌شه"
            onAdd={() => router.push('/mechanic')}
            btnLabel="افزودن ماشین"
          />
        ) : (
          <>
            {owing.length > 0 && (
              <Card style={{ marginBottom: 14 }} accentColor={C.statusWarn}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 800, color: C.text, margin: 0 }}>
                      {owing.length} مشتری بدهکار
                    </p>
                    <p style={{ fontSize: 11, color: C.muted, margin: '3px 0 0' }}>مجموع مانده حساب</p>
                  </div>
                  <Money amount={owing.reduce((s, c) => s + c.outstanding, 0)} color={C.statusWarn} size={16} />
                </div>
              </Card>
            )}

            <div style={{ marginBottom: 12 }}>
              <Input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="جستجوی نام، شماره یا پلاک..."
              />
            </div>

            {shown.length === 0 ? (
              <EmptyState icon={<SearchIcon size={24} />} title="چیزی پیدا نشد" sub="عبارت دیگری رو امتحان کن" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {shown.map(c => (
                  <Card key={c.key} padding="13px 15px">
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 13, flexShrink: 0,
                        background: alpha(C.green, 12), border: `1px solid ${alpha(C.green, 25)}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.green,
                        fontWeight: 900, fontSize: 15,
                      }}>{c.name.trim().charAt(0) || '؟'}</div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                          <p style={{ fontSize: 13.5, fontWeight: 800, color: C.text, margin: 0 }}>{c.name}</p>
                          {/* someone the mechanic typed in has no account yet — worth
                              flagging, because they can't be messaged in-app */}
                          {!c.registered && (
                            <span style={{
                              fontSize: 9.5, fontWeight: 700, color: C.subtle,
                              background: C.fill2, border: `1px solid ${C.border}`,
                              padding: '1px 7px', borderRadius: 7,
                            }}>بدون حساب</span>
                          )}
                        </div>

                        <p style={{ fontSize: 11, color: C.muted, margin: '4px 0 0', display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <CarIcon size={11} /> {c.vehicleCount} خودرو
                          </span>
                          <span>· {c.serviceCount} سرویس</span>
                          {c.lastServiceDate && <span>· آخرین: {toJalali(c.lastServiceDate)}</span>}
                        </p>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                          {c.vehicles.map(v => (
                            <Link
                              key={v.id}
                              href={`/mechanic/vehicles/${v.id}`}
                              style={{
                                fontSize: 10.5, fontWeight: 600, color: C.text2, textDecoration: 'none',
                                background: C.fill2, border: `1px solid ${C.border}`,
                                padding: '3px 9px', borderRadius: 8,
                              }}
                            >
                              {v.label}{v.plateNumber ? ` · ${v.plateNumber}` : ''}
                            </Link>
                          ))}
                        </div>
                      </div>

                      <div style={{ textAlign: 'left', flexShrink: 0 }}>
                        <Money amount={c.totalInvoiced} size={13} compact />
                        {c.outstanding > 0 && (
                          <p style={{ fontSize: 10, fontWeight: 700, color: C.statusWarn, margin: '4px 0 0', whiteSpace: 'nowrap' }}>
                            مانده: {Math.round(c.outstanding).toLocaleString('fa-IR')}
                          </p>
                        )}
                        {c.phone && (
                          <a href={`tel:${c.phone}`} style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6,
                            fontSize: 10.5, fontWeight: 700, color: C.green, textDecoration: 'none', direction: 'ltr',
                          }}>
                            <PhoneIcon size={11} /> {c.phone}
                          </a>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
