'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import { useUrlFilter } from '@/hooks/useUrlFilter';
import { Screen, ScreenHeader, Glance, Row, RowList, Chip, Filters, SCREEN_CSS, fa } from '@/components/ScreenKit';
import { api, Appointment, Role, toJalali } from '@/lib/api';
import { C, alpha, Button, EmptyState, Skeleton } from '@/components/ui';
import { CheckIcon, XIcon, WrenchIcon, CarIcon, WalletIcon, CalendarIcon } from '@/components/icons';
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
  const [filter, setFilter] = useUrlFilter('status', ['all', 'pending', 'confirmed', 'completed'] as const, 'all');

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

  const counts = {
    pending:   list.filter((a) => a.status === 'pending').length,
    confirmed: list.filter((a) => a.status === 'confirmed').length,
    completed: list.filter((a) => a.status === 'completed').length,
  };
  const shown = filter === 'all' ? list : list.filter((a) => a.status === filter);
  /* the next confirmed visit is the one thing worth knowing at a glance */
  const upcoming = list
    .filter((a) => a.status === 'confirmed' && new Date(a.requestedAt).getTime() >= Date.now() - 864e5)
    .sort((a, b) => +new Date(a.requestedAt) - +new Date(b.requestedAt))[0];

  return (
    <Screen>
      <ScreenHeader
        eyebrow={role === 'mechanic' ? 'درخواست‌های مشتری' : 'نوبت‌های من'}
        title="نوبت‌ها"
        subtitle={counts.pending
          ? (role === 'mechanic' ? `${fa(counts.pending)} درخواست منتظر جواب توست` : `${fa(counts.pending)} درخواست در انتظار تایید تعمیرگاه`)
          : 'درخواست بی‌جواب نداری'}
        back={role === 'mechanic' ? '/mechanic' : '/dashboard'}
      />

      {!loading && list.length > 0 && (
        <Glance items={[
          { label: 'در انتظار', value: fa(counts.pending), tone: counts.pending ? C.statusWarn : undefined, alert: counts.pending > 0 },
          { label: 'تاییدشده', value: fa(counts.confirmed), tone: C.statusMint },
          { label: 'انجام‌شده', value: fa(counts.completed), tone: C.statusInfo },
          upcoming
            ? { label: 'نوبت بعدی', value: toJalali(upcoming.requestedAt.slice(0, 10)), hint: upcoming.serviceType || undefined }
            : { label: 'نوبت بعدی', value: '—' },
        ]} />
      )}

      {error && <div className="ap-err" role="alert" style={{ color: C.statusExpired, background: alpha(C.statusExpired, 10) }}>{error}</div>}

      {list.length > 0 && (
        <Filters
          value={filter}
          onChange={setFilter}
          options={[
            { key: 'all', label: 'همه', count: list.length },
            { key: 'pending', label: 'در انتظار', count: counts.pending },
            { key: 'confirmed', label: 'تاییدشده', count: counts.confirmed },
            { key: 'completed', label: 'انجام‌شده', count: counts.completed },
          ]}
        />
      )}

      {loading ? (
        <RowList>{[0, 1].map((i) => <Skeleton key={i} height={78} radius={18} />)}</RowList>
      ) : shown.length === 0 ? (
        <EmptyState
          icon={<CalendarIcon size={26} />}
          title={list.length ? 'در این وضعیت نوبتی نیست' : 'هنوز نوبتی ثبت نشده'}
          sub={list.length ? 'فیلتر دیگری را امتحان کن' : (role === 'mechanic' ? 'وقتی مشتری درخواست بدهد اینجا می‌آید' : 'از صفحه خدمات، درخواست خدمت ثبت کن')}
        />
      ) : (
        <RowList>
          {shown.map((a) => {
            const st = STATUS_LABEL[a.status] || { label: a.status, color: C.muted };
            const dt = new Date(a.requestedAt);
            const when = isNaN(dt.getTime())
              ? a.requestedAt
              : `${toJalali(a.requestedAt.slice(0, 10))} · ${dt.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}`;
            const contactable = ['confirmed', 'completed'].includes(a.status);
            const phone = role === 'mechanic' ? a.owner?.phone : (contactable ? a.mechanic?.phone : undefined);
            const busy = actingId === a.id;

            return (
              <Row
                key={a.id}
                hue={st.color}
                icon={role === 'owner' ? <WrenchIcon size={20} /> : <CarIcon size={20} />}
                title={role === 'owner'
                  ? (a.mechanic?.workshopName || a.mechanic?.name || 'تعمیرگاه')
                  : `${a.vehicle?.make || ''} ${a.vehicle?.model || ''}`.trim() || 'خودرو'}
                meta={when}
                dim={['rejected', 'cancelled'].includes(a.status)}
                chips={<>
                  <Chip tone={st.color}>{st.label}</Chip>
                  {a.serviceType && <Chip tone={C.muted}>{a.serviceType}</Chip>}
                  <Chip tone={C.muted}>{a.mode === 'on_site' ? 'در محل' : 'در تعمیرگاه'}</Chip>
                  {phone && <a href={`tel:${phone}`} className="ap-tel" style={{ color: C.green, background: alpha(C.green, 12) }} dir="ltr">{phone}</a>}
                </>}
                actions={
                  role === 'mechanic' && a.status === 'pending' ? (
                    <>
                      <Button size="sm" loading={busy} onClick={() => act(a.id, 'confirm')} icon={<CheckIcon size={13} />}>تایید</Button>
                      <Button size="sm" variant="danger" disabled={busy} onClick={() => act(a.id, 'reject')} icon={<XIcon size={13} />}>رد</Button>
                    </>
                  ) : role === 'mechanic' && a.status === 'confirmed' ? (
                    <Button size="sm" loading={busy} onClick={() => act(a.id, 'complete')} icon={<CheckIcon size={13} />}>انجام شد</Button>
                  ) : role === 'mechanic' && a.status === 'completed' && a.serviceRecordId ? (
                    <Button size="sm" variant="secondary" onClick={() => router.push(`/mechanic/vehicles/${a.vehicleId}?record=${a.serviceRecordId}`)} icon={<WalletIcon size={13} />}>صدور فاکتور</Button>
                  ) : role === 'owner' && ['pending', 'confirmed'].includes(a.status) ? (
                    <Button size="sm" variant="danger" disabled={busy} onClick={() => act(a.id, 'cancel')} icon={<XIcon size={13} />}>لغو نوبت</Button>
                  ) : undefined
                }
              />
            );
          })}
        </RowList>
      )}

      <BottomNav />
      <style>{SCREEN_CSS + `
.ap-err{border-radius:14px;padding:11px 14px;font-size:12.5px;font-weight:800;margin-bottom:14px}
.ap-tel{display:inline-flex;align-items:center;border-radius:999px;padding:4px 9px;font-size:10.5px;font-weight:900;text-decoration:none}
      `}</style>
    </Screen>
  );
}
