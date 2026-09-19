'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import PlateInput from '@/components/PlateInput';
import PersianYearPicker, { currentJalaliYear } from '@/components/PersianYearPicker';
import { api, MechanicVehicle, MechanicStats, CreateMechanicVehicleInput, User } from '@/lib/api';
import { getToken, getUser, homeHref } from '@/lib/session';
import { C, EmptyState, SkeletonRow, Button, Input, FormField, Sheet, alpha } from '@/components/ui';
import { RoleGreeting, HeroStat, QueueCard, ToolRow, SectionHead, ROLE_HOME_CSS, fa } from '@/components/RoleHome';
import ThemeToggle from '@/components/ThemeToggle';
import NotificationsBell from '@/components/NotificationsBell';
import { CarIcon, WalletIcon, ChevronLeftIcon, LinkIcon, PlusIcon, CheckIcon, CalendarIcon, SettingsIcon, BoxIcon, MessageIcon, UsersIcon, CopyIcon, SparklesIcon } from '@/components/icons';

export default function MechanicDashboard() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<MechanicVehicle[]>([]);
  const [loading, setLoading]   = useState(true);
  const [workshop, setWorkshop] = useState<User | null>(null);
  const [stats, setStats] = useState<MechanicStats | null>(null);

  const [code, setCode]         = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [redeemError, setRedeemError] = useState('');
  const [showAddVehicle, setShowAddVehicle] = useState(false);

  /* Counters come from the server in one call. They used to be assembled here
     by fetching every connected vehicle's full detail — one request per car on
     every dashboard load. */
  function load() {
    setLoading(true);
    api.mechanic.listVehicles().then(setVehicles).finally(() => setLoading(false));
    api.mechanic.stats().then(setStats).catch(() => {});
  }

  useEffect(() => {
    if (!getToken()) { router.replace('/'); return; }
    const u = getUser();
    if (u && u.role !== 'mechanic') { router.replace(homeHref(u.role)); return; }
    if (u) setWorkshop(u);
    load();
  }, [router]);

  async function redeem(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setRedeeming(true);
    setRedeemError('');
    try {
      const res = await api.invites.redeem(code.trim());
      setCode('');
      load();
      router.push(`/mechanic/vehicles/${res.vehicleId}`);
    } catch (err: any) {
      setRedeemError(err.message);
    } finally {
      setRedeeming(false);
    }
  }

  const invoiced = stats?.invoicedThisMonth ?? 0;
  const pending = stats?.pendingAppointments ?? 0;
  const connected = stats?.vehicles ?? vehicles.length;
  const awaitingOwner = vehicles.filter((v) => v.linkStatus === 'pending').length;

  return (
    <div className="mech" data-density="dense">
      <main className="mech-main">
        <RoleGreeting
          eyebrow="تعمیرگاه من"
          title={workshop?.workshopName || workshop?.name || 'تعمیرگاه'}
          subtitle={pending > 0 ? `${fa(pending)} درخواست منتظر جواب توست` : 'امروز درخواست بی‌جواب نداری'}
          right={<>
            <NotificationsBell />
            <ThemeToggle size={38} />
            <Link href="/profile" className="mech-avatar" style={{ background: `linear-gradient(135deg, ${C.green}, ${C.greenDark})`, color: C.onAccent }}>
              {(workshop?.workshopName || workshop?.name || 'ت').trim().slice(0, 1)}
            </Link>
          </>}
        />

        {/* the figure a workshop actually opens the app for */}
        <HeroStat
          label="درآمد فاکتورهای این ماه"
          value={invoiced ? fa(invoiced) : '—'}
          unit={invoiced ? 'تومان' : undefined}
          note={invoiced ? undefined : 'وقتی فاکتور صادر کنی، اینجا جمع می‌شود'}
          tone={C.statusOk}
          side={[
            { label: 'سرویس این ماه', value: fa(stats?.servicesThisMonth ?? 0) },
            { label: 'خودروی متصل', value: fa(connected) },
          ]}
        />

        {pending > 0 && (
          <QueueCard
            icon={<CalendarIcon size={20} />}
            title={`${fa(pending)} درخواست نوبت بی‌جواب`}
            body="تا تایید نکنی مشتری منتظر می‌ماند"
            cta="بررسی"
            href="/appointments"
          />
        )}
        {awaitingOwner > 0 && (
          <QueueCard
            icon={<LinkIcon size={20} />}
            title={`${fa(awaitingOwner)} خودرو منتظر تایید مالک`}
            body="تا مالک تایید نکند، سوابق کامل را نمی‌بینی"
            cta="مشاهده"
            href="/mechanic/customers"
            tone={C.statusInfo}
          />
        )}

        <SectionHead title="ابزارهای تعمیرگاه" />
        <ToolRow tools={[
          { href: '/mechanic/requests',   label: 'درخواست‌های باز', hint: 'کار تازه', icon: <SparklesIcon size={19} />, hue: 'var(--svc-tuning)' },
          { href: '/mechanic/services',   label: 'خدمات من', hint: 'نوع و قیمت',  icon: <SettingsIcon size={19} />, hue: 'var(--svc-oil)' },
          { href: '/mechanic/parts',      label: 'انبار قطعات', hint: 'موجودی',   icon: <BoxIcon size={19} />,      hue: 'var(--svc-tire)' },
          { href: '/mechanic/customers',  label: 'مشتری‌ها', hint: 'سوابق',       icon: <UsersIcon size={19} />,    hue: 'var(--svc-filter)' },
          { href: '/mechanic/accounting', label: 'حساب‌وکتاب', hint: 'فاکتورها',  icon: <WalletIcon size={19} />,   hue: 'var(--svc-gearbox)' },
          { href: '/mechanic/expenses',   label: 'هزینه‌ها', hint: 'اجاره، حقوق', icon: <CopyIcon size={19} />,     hue: 'var(--svc-paint)' },
          { href: '/messages',            label: 'گفتگوها', hint: 'با مشتری',     icon: <MessageIcon size={19} />,  hue: 'var(--svc-ac)' },
        ]} />

        <SectionHead title="خودروهای من" />
        <div className="mech-add">
          <button type="button" onClick={() => setShowAddVehicle(true)} className="mech-add-btn" style={{ background: C.surfaceSolid, boxShadow: C.shadowSoft }}>
            <span style={{ background: alpha(C.green, 12), color: C.green }}><PlusIcon size={18} /></span>
            <b style={{ color: C.textStrong }}>افزودن با پلاک</b>
            <small style={{ color: C.muted }}>بدون کد دعوت</small>
          </button>
          <form onSubmit={redeem} className="mech-redeem" style={{ background: C.surfaceSolid, boxShadow: C.shadowSoft }}>
            <label style={{ color: C.muted }}>کد دعوت مالک</label>
            <div>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="DTQMHPDB"
                dir="ltr"
                style={{ textAlign: 'center', letterSpacing: 3, fontWeight: 800 }}
              />
              <Button type="submit" loading={redeeming} size="sm">اتصال</Button>
            </div>
          </form>
        </div>
        {redeemError && (
          <div className="mech-err" role="alert" style={{ color: C.statusExpired, background: alpha(C.statusExpired, 10) }}>{redeemError}</div>
        )}

        {loading ? (
          <div style={{ background: C.surfaceSolid, borderRadius: 20, overflow: 'hidden' }}><SkeletonRow /><SkeletonRow /></div>
        ) : vehicles.length === 0 ? (
          <EmptyState
            icon={<CarIcon size={26} />}
            title="هنوز خودرویی وصل نشده"
            sub="با پلاک اضافه کن یا کد دعوت مالک را وارد کن"
          />
        ) : (
          <div className="mech-cars">
            {vehicles.map((v) => (
              <Link key={v.accessId} href={`/mechanic/vehicles/${v.vehicleId}`} className="mech-car" style={{ background: C.surfaceSolid, boxShadow: C.shadowSoft }}>
                <span style={{ background: alpha(C.green, 11), color: C.green }}><CarIcon size={21} /></span>
                <div>
                  <b style={{ color: C.textStrong }}>{v.make} {v.model}</b>
                  <small style={{ color: C.muted }}>
                    {v.ownerName || 'بدون مالک ثبت‌شده'}{v.plateNumber ? ` · ${v.plateNumber}` : ''}
                  </small>
                </div>
                {v.linkStatus === 'pending'
                  ? <em style={{ color: C.statusWarn, background: alpha(C.statusWarn, 12) }}>در انتظار مالک</em>
                  : <ChevronLeftIcon size={16} color={C.subtle} />}
              </Link>
            ))}
          </div>
        )}
      </main>

      {showAddVehicle && (
        <AddVehicleSheet
          onClose={() => setShowAddVehicle(false)}
          onSaved={(vehicleId) => { setShowAddVehicle(false); load(); router.push(`/mechanic/vehicles/${vehicleId}`); }}
        />
      )}
      <BottomNav />
      <style>{ROLE_HOME_CSS + `
.mech{min-height:100vh;background:var(--bg-gradient)}
.mech-main{max-width:640px;margin:0 auto;padding:8px 16px calc(104px + env(safe-area-inset-bottom))}
.mech-avatar{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;font:900 17px var(--font-sans);text-decoration:none;flex-shrink:0}
.mech-add{display:grid;grid-template-columns:150px 1fr;gap:10px;margin-bottom:14px}
.mech-add-btn{border:0;border-radius:18px;padding:13px 12px;cursor:pointer;font-family:var(--font-sans);display:grid;justify-items:start;gap:2px;text-align:right;transition:transform .18s cubic-bezier(.16,1,.3,1)}
.mech-add-btn:hover{transform:translateY(-2px)}
.mech-add-btn:active{transform:scale(.98)}
.mech-add-btn>span{width:38px;height:38px;border-radius:13px;display:grid;place-items:center;margin-bottom:6px}
.mech-add-btn b{font-size:12.5px;font-weight:900}
.mech-add-btn small{font-size:10.5px}
.mech-redeem{border-radius:18px;padding:12px 13px;display:grid;gap:7px}
.mech-redeem label{font-size:10.5px;font-weight:900}
.mech-redeem>div{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center}
.mech-err{border-radius:14px;padding:10px 13px;font-size:12px;font-weight:800;margin-bottom:12px}
.mech-cars{display:grid;gap:10px}
.mech-car{display:flex;align-items:center;gap:12px;border-radius:18px;padding:12px 13px;text-decoration:none;transition:transform .16s ease}
.mech-car:hover{transform:translateY(-2px)}
.mech-car>span{width:44px;height:44px;border-radius:15px;display:grid;place-items:center;flex-shrink:0}
.mech-car>div{flex:1;min-width:0}
.mech-car b{display:block;font-size:14px;font-weight:900}
.mech-car small{display:block;font-size:11.5px;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mech-car em{font-style:normal;font-size:10.5px;font-weight:900;border-radius:999px;padding:5px 10px;white-space:nowrap;flex-shrink:0}
@media(max-width:420px){.mech-add{grid-template-columns:1fr}}
      `}</style>
    </div>
  );
}

function AddVehicleSheet({ onClose, onSaved }: { onClose: () => void; onSaved: (vehicleId: string) => void }) {
  const [form, setForm] = useState({
    make: '', model: '', year: currentJalaliYear(), plateNumber: '', customerName: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function set(key: string, val: string | number) { setForm(f => ({ ...f, [key]: val })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload: CreateMechanicVehicleInput = {
        make: form.make,
        model: form.model,
        year: Number(form.year),
        plateNumber: form.plateNumber || undefined,
        customerName: form.customerName || undefined,
      };
      const v = await api.mechanic.createVehicle(payload);
      onSaved(v.id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet title="افزودن ماشین جدید" icon={<CarIcon size={17} />} onClose={onClose}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FormField label="شماره پلاک">
          <PlateInput value={form.plateNumber} onChange={v => set('plateNumber', v)} />
        </FormField>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="سازنده" required>
            <Input placeholder="Toyota / ایران‌خودرو" value={form.make} onChange={e => set('make', e.target.value)} required />
          </FormField>
          <FormField label="مدل" required>
            <Input placeholder="Camry / پژو 206" value={form.model} onChange={e => set('model', e.target.value)} required />
          </FormField>
        </div>
        <FormField label="سال ساخت (شمسی)" required>
          <PersianYearPicker value={form.year} onChange={y => set('year', y)} />
        </FormField>
        <FormField label="نام مشتری (اختیاری)">
          <Input placeholder="اگر مشتری هنوز در برنامه ثبت‌نام نکرده" value={form.customerName} onChange={e => set('customerName', e.target.value)} />
        </FormField>

        {error && (
          <div role="alert" style={{ fontSize: 12, color: C.statusExpired, background: alpha(C.statusExpired, 10), border: `1px solid ${alpha(C.statusExpired, 20)}`, borderRadius: 11, padding: '10px 14px' }}>
            {error}
          </div>
        )}

        <Button type="submit" loading={loading} fullWidth size="lg" icon={<CheckIcon size={16} />}>ثبت ماشین</Button>
      </form>
    </Sheet>
  );
}
