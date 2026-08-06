'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import { api, Appointment, Role, toJalali } from '@/lib/api';
import { C, Card, Button, EmptyState, Spinner, alpha } from '@/components/ui';
import { ChevronRightIcon, CalendarIcon, CheckIcon, XIcon, CarIcon, WrenchIcon, PinIcon, PhoneIcon, StoreIcon, NavigationIcon } from '@/components/icons';
import { getToken, getRole } from '@/lib/session';

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending:   { label: 'در انتظار تایید', color: C.statusWarn },
  confirmed: { label: 'تایید شده',       color: C.statusMint },
  rejected:  { label: 'رد شده',          color: C.statusExpired },
  completed: { label: 'انجام‌شده',        color: C.statusInfo },
  cancelled: { label: 'لغوشده',          color: C.statusNeutral },
};

export default function AppointmentsPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>('owner');
  const [list, setList] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  function load() {
    api.appointments.mine().then(setList).finally(() => setLoading(false));
  }
  useEffect(() => {
    if (!getToken()) { router.replace('/'); return; }
    setRole(getRole());
    load();
  }, [router]);

  async function act(id: string, action: 'confirm' | 'reject' | 'complete' | 'cancel') {
    if (action === 'cancel' && !confirm('این نوبت لغو شود؟')) return;
    setActingId(id);
    setError('');
    try {
      if (action === 'confirm') await api.appointments.respond(id, 'confirmed');
      else if (action === 'reject') await api.appointments.respond(id, 'rejected');
      else if (action === 'complete') await api.appointments.complete(id);
      else await api.appointments.cancel(id);
      load();
    } catch (err: any) {
      // the server rejects races (someone else already answered) — say so
      // instead of leaving the button silently stuck
      setError(err.message || 'انجام عملیات ناموفق بود');
    } finally {
      setActingId(null);
    }
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar title="نوبت‌ها" />
      <main style={{ maxWidth: 560, margin: '0 auto', padding: '0 14px calc(88px + env(safe-area-inset-bottom))' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: C.muted, fontSize: 13, fontWeight: 600, padding: '14px 0 10px', display: 'flex', alignItems: 'center', gap: 5 }}>
          <ChevronRightIcon size={16} /> بازگشت
        </button>

        {error && (
          <div style={{
            fontSize: 12, color: C.statusExpired, background: alpha(C.statusExpired, 10),
            border: `1px solid ${alpha(C.statusExpired, 20)}`, borderRadius: 11,
            padding: '10px 14px', marginBottom: 12,
          }}>{error}</div>
        )}

        {loading ? (
          <Spinner />
        ) : list.length === 0 ? (
          <EmptyState icon={<CalendarIcon size={26} />} title="نوبتی نداری" sub={role === 'owner' ? 'از صفحه تعمیرگاه‌ها یک نوبت رزرو کن' : 'وقتی مشتری‌ها نوبت بگیرن، اینجا نشونت می‌دیم'} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {list.map(a => {
              const st = STATUS_LABEL[a.status];
              const dt = new Date(a.requestedAt);
              /* the phone is only worth surfacing once the booking is live —
                 before then the two sides have no business calling each other */
              const contactable = ['confirmed', 'completed'].includes(a.status);
              const counterpartPhone = role === 'mechanic'
                ? a.owner?.phone
                : contactable ? a.mechanic?.phone : undefined;
              return (
                <Card key={a.id} padding="14px 16px">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 12, background: `${alpha(st.color, 12)}`, border: `1px solid ${alpha(st.color, 25)}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: st.color, flexShrink: 0,
                      }}>{role === 'owner' ? <WrenchIcon size={18} /> : <CarIcon size={18} />}</div>
                      <div>
                        <p style={{ fontSize: 13.5, fontWeight: 800, color: C.text, margin: 0 }}>
                          {role === 'owner' ? (a.mechanic?.workshopName || a.mechanic?.name) : `${a.vehicle?.make} ${a.vehicle?.model}`}
                        </p>
                        <p style={{ fontSize: 11, color: C.muted, margin: '4px 0 0' }}>
                          {isNaN(dt.getTime()) ? a.requestedAt : `${toJalali(a.requestedAt.slice(0, 10))} · ${dt.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}`}
                        </p>
                        <p style={{ fontSize: 11, color: C.subtle, margin: '3px 0 0', display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            {a.mode === 'on_site' ? <NavigationIcon size={11} /> : <StoreIcon size={11} />}
                            {a.mode === 'on_site' ? 'در محل' : 'حضوری'}
                          </span>
                          {a.serviceType && <span>· {a.serviceType}</span>}
                        </p>
                      </div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 800, color: st.color, background: `${alpha(st.color, 12)}`, padding: '3px 9px', borderRadius: 8, whiteSpace: 'nowrap' }}>{st.label}</span>
                  </div>

                  {/* An on-site job is undeliverable without the address, and
                      neither side can sort out a problem without a phone number.
                      Both were being collected and then never shown. */}
                  {a.mode === 'on_site' && a.address && (
                    <p style={{ fontSize: 11.5, color: C.muted, margin: '10px 0 0', display: 'flex', alignItems: 'flex-start', gap: 6, lineHeight: 1.7 }}>
                      <PinIcon size={13} /> <span>{a.address}</span>
                    </p>
                  )}

                  {counterpartPhone && (
                    <a
                      href={`tel:${counterpartPhone}`}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10,
                        fontSize: 11.5, fontWeight: 700, color: C.green, textDecoration: 'none',
                        direction: 'ltr',
                      }}
                    >
                      <PhoneIcon size={13} /> {counterpartPhone}
                    </a>
                  )}

                  {a.notes && <p style={{ fontSize: 12, color: C.muted, margin: '10px 0 0', lineHeight: 1.7 }}>{a.notes}</p>}

                  {role === 'mechanic' && a.status === 'pending' && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <Button size="sm" fullWidth loading={actingId === a.id} onClick={() => act(a.id, 'confirm')} icon={<CheckIcon size={13} />}>تایید</Button>
                      <Button size="sm" fullWidth variant="danger" disabled={actingId === a.id} onClick={() => act(a.id, 'reject')} icon={<XIcon size={13} />}>رد</Button>
                    </div>
                  )}
                  {role === 'mechanic' && a.status === 'confirmed' && (
                    <Button size="sm" fullWidth loading={actingId === a.id} onClick={() => act(a.id, 'complete')} style={{ marginTop: 12 }} icon={<CheckIcon size={13} />}>ثبت به‌عنوان انجام‌شده</Button>
                  )}
                  {role === 'owner' && ['pending', 'confirmed'].includes(a.status) && (
                    <Button size="sm" fullWidth variant="danger" disabled={actingId === a.id} onClick={() => act(a.id, 'cancel')} style={{ marginTop: 12 }} icon={<XIcon size={13} />}>لغو نوبت</Button>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
