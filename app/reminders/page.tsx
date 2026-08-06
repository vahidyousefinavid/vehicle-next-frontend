'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import PersianDatePicker from '@/components/PersianDatePicker';
import { api, AgendaItem, Vehicle, toJalali } from '@/lib/api';
import { getToken } from '@/lib/session';
import {
  C, alpha, Card, Button, EmptyState, Spinner, FormField, Input, TextArea, Sheet, ChipGroup,
} from '@/components/ui';
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

  function load() {
    api.agenda.list().then(setItems).finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!getToken()) { router.replace('/'); return; }
    load();
  }, [router]);

  async function complete(item: AgendaItem) {
    setBusyId(item.id);
    try {
      await api.reminders.toggle(item.vehicleId, item.id);
      load();
    } finally {
      setBusyId(null);
    }
  }

  const overdue = items.filter(i => i.daysLeft !== null && i.daysLeft < 0);
  const soon = items.filter(i => i.daysLeft !== null && i.daysLeft >= 0 && i.daysLeft <= 30);
  const later = items.filter(i => i.daysLeft === null || i.daysLeft > 30);

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar title="یادآورها" />
      <main style={{ maxWidth: 560, margin: '0 auto', padding: '0 14px calc(88px + env(safe-area-inset-bottom))' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: C.muted, fontSize: 13, fontWeight: 600, padding: '14px 0 10px', display: 'flex', alignItems: 'center', gap: 5 }}>
          <ChevronRightIcon size={16} /> بازگشت
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <p style={{ fontSize: 12, color: C.muted, margin: 0, lineHeight: 1.7 }}>
            یادآورها، مدارک و سرویس‌های همه خودروهات یک‌جا
          </p>
          <Button size="sm" onClick={() => setShowAdd(true)} icon={<PlusIcon size={14} />}>یادآور جدید</Button>
        </div>

        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<BellIcon size={26} />}
            title="چیزی در پیش نیست"
            sub="تاریخ بیمه و معاینه فنی خودروهات رو ثبت کن تا قبل از انقضا بهت خبر بدیم"
            onAdd={() => setShowAdd(true)}
            btnLabel="افزودن یادآور"
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <Group title="گذشته از موعد" items={overdue} onComplete={complete} busyId={busyId} />
            <Group title="۳۰ روز آینده" items={soon} onComplete={complete} busyId={busyId} />
            <Group title="بعدتر" items={later} onComplete={complete} busyId={busyId} />
          </div>
        )}
      </main>

      {showAdd && (
        <AddReminderSheet
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); load(); }}
        />
      )}
      <BottomNav />
    </div>
  );
}

function Group({ title, items, onComplete, busyId }: {
  title: string; items: AgendaItem[];
  onComplete: (i: AgendaItem) => void; busyId: string | null;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <h2 style={{ color: C.text2, fontSize: 13, fontWeight: 700, margin: '0 0 9px' }}>
        {title} <span style={{ color: C.subtle, fontWeight: 600 }}>({items.length})</span>
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map(item => {
          const meta = KIND_META[item.kind];
          const Icon = meta.icon;
          const u = urgency(item.daysLeft);
          return (
            <Card key={item.id} padding="12px 14px">
              <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 12, flexShrink: 0,
                  background: alpha(meta.color, 12), border: `1px solid ${alpha(meta.color, 25)}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: meta.color,
                }}><Icon size={17} /></div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 800, color: C.text, margin: 0 }}>{item.title}</p>
                  <p style={{ fontSize: 10.5, color: C.subtle, margin: '3px 0 0', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span>{item.vehicleName}</span>
                    <span>· {meta.label}</span>
                    {item.dueDate && <span>· {toJalali(item.dueDate)}</span>}
                    {item.dueMileage != null && <span>· {item.dueMileage.toLocaleString()} km</span>}
                  </p>
                </div>

                <span style={{
                  fontSize: 10, fontWeight: 800, color: u.color, background: alpha(u.color, 12),
                  padding: '3px 9px', borderRadius: 8, whiteSpace: 'nowrap', flexShrink: 0,
                }}>{u.text}</span>

                {/* only something the user wrote can be ticked off — an expiry
                    date goes away by being renewed, not by being checked */}
                {item.completable && (
                  <button
                    onClick={() => onComplete(item)}
                    disabled={busyId === item.id}
                    aria-label="انجام شد"
                    style={{
                      width: 30, height: 30, borderRadius: 10, flexShrink: 0,
                      background: 'transparent', border: `1px solid ${C.border}`,
                      color: C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  ><CheckIcon size={14} /></button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
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
                padding: '11px 14px', fontSize: 13, color: C.text, fontFamily: 'Vazirmatn, sans-serif',
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
          <div style={{ fontSize: 12, color: C.statusExpired, background: alpha(C.statusExpired, 10), border: `1px solid ${alpha(C.statusExpired, 20)}`, borderRadius: 11, padding: '10px 14px' }}>{error}</div>
        )}
        <Button type="submit" loading={saving} disabled={vehicles.length === 0} fullWidth size="lg">ثبت یادآور</Button>
      </form>
    </Sheet>
  );
}
