'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import { useUrlFilter } from '@/hooks/useUrlFilter';
import PersianDatePicker from '@/components/PersianDatePicker';
import { api, AgendaItem, Vehicle, toJalali } from '@/lib/api';
import { getToken } from '@/lib/session';
import { C, alpha, Button, EmptyState, Skeleton, FormField, Input, TextArea, Sheet, ChipGroup } from '@/components/ui';
import { Screen, ScreenHeader, Glance, Row, RowList, Chip, Filters, SCREEN_CSS, fa } from '@/components/ScreenKit';
import {
  ChevronRightIcon, BellIcon, PlusIcon, ShieldIcon, WrenchIcon, CheckIcon, CarIcon,
} from '@/components/icons';

const KIND_META = {
  reminder: { label: 'یادآور من', icon: BellIcon,   color: C.green },
  document: { label: 'مدارک',      icon: ShieldIcon, color: C.statusInfo },
  service:  { label: 'سرویس',      icon: WrenchIcon, color: C.statusMint },
} as const;

/** Overdue reads as urgent, then this week, then this month, then the rest. */
function urgency(days: number | null) {
  if (days === null) return { color: C.muted, text: 'بدون تاریخ' };
  if (days < 0) return { color: C.statusExpired, text: `${Math.abs(days)} روز گذشته` };
  if (days === 0) return { color: C.statusExpired, text: 'امروز' };
  if (days <= 7) return { color: C.statusDanger, text: `${days} روز دیگر` };
  if (days <= 30) return { color: C.statusWarn, text: `${days} روز دیگر` };
  return { color: C.muted, text: `${days} روز دیگر` };
}

export default function RemindersPage() {
  const router = useRouter();
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useUrlFilter('when', ['all', 'overdue', 'soon', 'later'] as const, 'all');

  function load() {
    api.agenda.list().then(setItems).finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!getToken()) { router.replace('/'); return; }
    load();
  }, [router]);

  async function onCompleteItem(item: AgendaItem) {
    setBusyId(item.id);
    try {
      await api.reminders.toggle(item.vehicleId, item.id);
      load();
    } finally {
      setBusyId(null);
    }
  }

  const overdue = items.filter((i) => i.daysLeft !== null && i.daysLeft < 0);
  const soon = items.filter((i) => i.daysLeft !== null && i.daysLeft >= 0 && i.daysLeft <= 30);
  const later = items.filter((i) => i.daysLeft === null || i.daysLeft > 30);
  const shown = filter === 'overdue' ? overdue : filter === 'soon' ? soon : filter === 'later' ? later : items;
  const nextUp = soon[0] ?? later[0];

  return (
    <Screen>
      <ScreenHeader
        eyebrow="برنامه من"
        title="یادآورها"
        subtitle={overdue.length
          ? `${fa(overdue.length)} مورد از سررسید گذشته`
          : soon.length ? `${fa(soon.length)} مورد در ۳۰ روز آینده` : 'چیزی نزدیک سررسید نیست'}
        back="/dashboard"
        action={<Button size="sm" onClick={() => setShowAdd(true)} icon={<PlusIcon size={14} />}>جدید</Button>}
      />

      {!loading && items.length > 0 && (
        <Glance items={[
          { label: 'از سررسید گذشته', value: fa(overdue.length), tone: overdue.length ? C.statusExpired : C.statusOk, alert: overdue.length > 0 },
          { label: 'تا ۳۰ روز', value: fa(soon.length), tone: soon.length ? C.statusWarn : undefined },
          { label: 'بعداً', value: fa(later.length) },
          nextUp
            ? { label: 'نزدیک‌ترین', value: nextUp.daysLeft === null ? '—' : `${fa(Math.abs(nextUp.daysLeft))} روز`, hint: nextUp.title.slice(0, 18) }
            : { label: 'نزدیک‌ترین', value: '—' },
        ]} />
      )}

      {items.length > 0 && (
        <Filters
          value={filter}
          onChange={setFilter}
          options={[
            { key: 'all', label: 'همه', count: items.length },
            { key: 'overdue', label: 'گذشته', count: overdue.length },
            { key: 'soon', label: '۳۰ روز', count: soon.length },
            { key: 'later', label: 'بعداً', count: later.length },
          ]}
        />
      )}

      {loading ? (
        <RowList>{[0, 1, 2].map((i) => <Skeleton key={i} height={74} radius={18} />)}</RowList>
      ) : shown.length === 0 ? (
        <EmptyState
          icon={<BellIcon size={26} />}
          title={items.length ? 'در این بازه چیزی نیست' : 'یادآوری ثبت نشده'}
          sub={items.length ? 'فیلتر دیگری را امتحان کن' : 'برای بیمه، معاینه فنی یا سرویس دوره‌ای یادآور بگذار'}
          onAdd={items.length ? undefined : () => setShowAdd(true)}
          btnLabel="یادآور جدید"
        />
      ) : (
        <RowList>
          {shown.map((item) => {
            const meta = KIND_META[item.kind];
            const Icon = meta.icon;
            const u = urgency(item.daysLeft);
            const hue = item.daysLeft === null ? meta.color
              : item.daysLeft < 0 ? C.statusExpired
              : item.daysLeft <= 7 ? C.statusWarn
              : item.daysLeft <= 30 ? C.statusInfo : C.statusOk;
            return (
              <Row
                key={`${item.kind}-${item.id}`}
                hue={hue}
                icon={<Icon size={20} />}
                title={item.title}
                meta={<>{item.vehicleName}{item.plateNumber ? ` · ${item.plateNumber}` : ''}</>}
                chips={<>
                  <Chip tone={meta.color}>{meta.label}</Chip>
                  {item.daysLeft !== null && (
                    <Chip tone={hue}>
                      {item.daysLeft < 0 ? `${fa(Math.abs(item.daysLeft))} روز گذشته` : item.daysLeft === 0 ? 'امروز' : `${fa(item.daysLeft)} روز مانده`}
                    </Chip>
                  )}
                  {item.dueDate && <Chip tone={C.muted}>{toJalali(item.dueDate)}</Chip>}
                  {item.dueMileage && <Chip tone={C.muted}>{fa(item.dueMileage)} km</Chip>}
                </>}
                actions={item.kind === 'reminder' ? (
                  <Button size="sm" variant="secondary" loading={busyId === item.id} onClick={() => onCompleteItem(item)} icon={<CheckIcon size={13} />}>
                    انجام شد
                  </Button>
                ) : undefined}
              />
            );
          })}
        </RowList>
      )}

      {showAdd && <AddReminderSheet onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load(); }} />}
      <BottomNav />
      <style>{SCREEN_CSS}</style>
    </Screen>
  );
}

function AddReminderSheet({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleId, setVehicleId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueMileage, setDueMileage] = useState('');
  const [priority, setPriority] = useState('متوسط');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.vehicles.list().then(list => {
      setVehicles(list);
      if (list.length >= 1) setVehicleId(list[0].id);
    }).catch(() => {});
  }, []);

  const PRIORITY: Record<string, string> = { 'کم': 'low', 'متوسط': 'medium', 'زیاد': 'high' };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!vehicleId) { setError('اول یک خودرو ثبت کن'); return; }
    setSaving(true);
    setError('');
    try {
      await api.reminders.create(vehicleId, {
        title,
        description: description || undefined,
        dueDate: dueDate || undefined,
        dueMileage: dueMileage ? Number(dueMileage) : undefined,
        priority: PRIORITY[priority],
      });
      onSaved();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet title="یادآور جدید" icon={<BellIcon size={16} />} onClose={onClose}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FormField label="خودرو" required>
          {vehicles.length === 0 ? (
            <EmptyState icon={<CarIcon size={20} />} title="هنوز خودرویی ثبت نکردی" sub="برای ثبت یادآور به یک خودرو نیاز داری" />
          ) : (
            <select
              value={vehicleId}
              onChange={e => setVehicleId(e.target.value)}
              style={{
                width: '100%', background: C.fill2, border: `1px solid ${C.border}`, borderRadius: 14,
                padding: '11px 14px', fontSize: 13, color: C.text, fontFamily: 'var(--font-sans)',
              }}
            >
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.make} {v.model}{v.plateNumber ? ` · ${v.plateNumber}` : ''}</option>
              ))}
            </select>
          )}
        </FormField>

        <FormField label="عنوان" required>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="مثلاً تعویض روغن" required />
        </FormField>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="تاریخ سررسید">
            <PersianDatePicker value={dueDate} onChange={setDueDate} />
          </FormField>
          <FormField label="کیلومتر سررسید">
            <Input value={dueMileage} onChange={e => setDueMileage(e.target.value)} type="number" placeholder="مثلاً ۹۵۰۰۰" />
          </FormField>
        </div>

        <FormField label="اهمیت">
          <ChipGroup options={['کم', 'متوسط', 'زیاد']} value={priority} onChange={setPriority} />
        </FormField>

        <FormField label="توضیحات (اختیاری)">
          <TextArea value={description} onChange={e => setDescription(e.target.value)} rows={2} />
        </FormField>

        <p style={{ fontSize: 11, color: C.subtle, margin: 0, lineHeight: 1.7 }}>
          سررسید که برسه، توی برنامه بهت اطلاع می‌دیم — یادآورهای مهم پیامک هم می‌شن.
        </p>

        {error && (
          <div role="alert" style={{ fontSize: 12, color: C.statusExpired, background: alpha(C.statusExpired, 10), border: `1px solid ${alpha(C.statusExpired, 20)}`, borderRadius: 11, padding: '10px 14px' }}>{error}</div>
        )}
        <Button type="submit" loading={saving} disabled={vehicles.length === 0} fullWidth size="lg">ثبت یادآور</Button>
      </form>
    </Sheet>
  );
}
