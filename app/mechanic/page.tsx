'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import PlateInput from '@/components/PlateInput';
import PersianYearPicker, { currentJalaliYear } from '@/components/PersianYearPicker';
import { api, MechanicVehicle, MechanicStats, CreateMechanicVehicleInput, User } from '@/lib/api';
import { getToken, getUser, homeHref } from '@/lib/session';
import { C, Card, StatGrid, EmptyState, SkeletonRow, Button, Input, FormField, Sheet, alpha } from '@/components/ui';
import { CarIcon, WrenchIcon, WalletIcon, ChevronLeftIcon, LinkIcon, PlusIcon, CheckIcon, CalendarIcon } from '@/components/icons';

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
  const statCards = [
    { label: 'خودروها', value: String(stats?.vehicles ?? vehicles.length), icon: <CarIcon size={17} />, color: C.green },
    { label: 'سرویس این ماه', value: String(stats?.servicesThisMonth ?? 0), icon: <WrenchIcon size={17} />, color: C.statusInfo },
    {
      label: 'درآمد این ماه', icon: <WalletIcon size={17} />, color: C.statusMint,
      value: invoiced > 0 ? `${(invoiced / 1_000_000).toFixed(1)}M` : '—',
      sub: invoiced > 0 ? 'تومان' : '',
    },
  ];

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      <main style={{ maxWidth: 520, margin: '0 auto', padding: '0 16px calc(88px + env(safe-area-inset-bottom))' }}>

        <div style={{ padding: '18px 0 14px' }}>
          <p style={{ color: C.muted, fontSize: 12, margin: 0, fontWeight: 500 }}>پنل تعمیرگاه</p>
          <h1 style={{ color: C.text, fontSize: 21, fontWeight: 900, margin: '5px 0 0' }}>
            {workshop?.workshopName || workshop?.name || 'تعمیرگاه'}
          </h1>
        </div>

        <div style={{ marginBottom: 20 }}>
          <StatGrid stats={statCards} />
        </div>

        {/* A pending request is the one thing on this screen that needs an
            answer today, so it gets a route out of the dashboard rather than
            only living behind the tab bar. */}
        {(stats?.pendingAppointments ?? 0) > 0 && (
          <Card style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 12, flexShrink: 0,
                background: alpha(C.statusWarn, 12), border: `1px solid ${alpha(C.statusWarn, 25)}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.statusWarn,
              }}><CalendarIcon size={18} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13.5, fontWeight: 800, color: C.text, margin: 0 }}>
                  {stats!.pendingAppointments} درخواست نوبت در انتظار پاسخ
                </p>
                <p style={{ fontSize: 11, color: C.muted, margin: '3px 0 0' }}>
                  تا تایید نکنی، مشتری منتظر می‌مونه
                </p>
              </div>
              <Button size="sm" onClick={() => router.push('/appointments')}>بررسی</Button>
            </div>
          </Card>
        )}

        <Card style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 10,
              background: alpha(C.green, 12), border: `1px solid ${alpha(C.green, 19)}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.green,
            }}><CarIcon size={15} /></div>
            <h2 style={{ fontSize: 14, fontWeight: 800, color: C.text, margin: 0 }}>افزودن ماشین با پلاک</h2>
          </div>
          <p style={{ fontSize: 12, color: C.muted, margin: '0 0 14px', lineHeight: 1.7 }}>
            بدون نیاز به کد دعوت — فقط پلاک و مشخصات ماشین رو وارد کن و همین الان سرویس ثبت کن.
          </p>
          <Button fullWidth icon={<PlusIcon size={15} />} onClick={() => setShowAddVehicle(true)}>افزودن ماشین جدید</Button>
        </Card>

        <Card style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 10,
              background: alpha(C.green, 12), border: `1px solid ${alpha(C.green, 19)}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.green,
            }}><LinkIcon size={15} /></div>
            <h2 style={{ fontSize: 14, fontWeight: 800, color: C.text, margin: 0 }}>اتصال با کد دعوت مالک</h2>
          </div>
          <form onSubmit={redeem} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <FormField label="کد دعوت مالک خودرو">
              <Input
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="مثلاً: DTQMHPDB"
                dir="ltr"
                style={{ textAlign: 'center', letterSpacing: 3, fontWeight: 800 }}
              />
            </FormField>
            {redeemError && (
              <div style={{ fontSize: 12, color: C.statusExpired, background: alpha(C.statusExpired, 10), border: `1px solid ${alpha(C.statusExpired, 20)}`, borderRadius: 11, padding: '10px 14px' }}>
                {redeemError}
              </div>
            )}
            <Button type="submit" loading={redeeming} fullWidth>اتصال</Button>
          </form>
        </Card>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ color: C.text2, fontSize: 14, fontWeight: 700, margin: 0 }}>خودروهای متصل</h2>
        </div>

        {loading ? (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 22, overflow: 'hidden' }}>
            <SkeletonRow /><SkeletonRow />
          </div>
        ) : vehicles.length === 0 ? (
          <EmptyState
            icon={<CarIcon size={26} />}
            title="هنوز به خودرویی متصل نشدی"
            sub="کد دعوت رو از مالک خودرو بگیر و بالا وارد کن"
          />
        ) : (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 22, overflow: 'hidden' }}>
            {vehicles.map((v, i) => (
              <Link key={v.accessId} href={`/mechanic/vehicles/${v.vehicleId}`} style={{ textDecoration: 'none', display: 'block' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
                  borderBottom: i === vehicles.length - 1 ? 'none' : `1px solid ${C.border}`,
                }}>
                  <div style={{
                    width: 46, height: 46, borderRadius: 15, flexShrink: 0,
                    background: `${alpha(C.green, 12)}`, border: `1px solid ${alpha(C.green, 25)}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.green,
                  }}><CarIcon size={21} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: C.text, fontSize: 14, fontWeight: 700, margin: 0 }}>{v.make} {v.model}</p>
                    <p style={{ color: C.muted, fontSize: 12, fontWeight: 500, margin: '3px 0 0' }}>
                      مالک: {v.ownerName || '—'} {v.plateNumber ? `· ${v.plateNumber}` : ''}
                    </p>
                    {v.linkStatus === 'pending' && (
                      <span style={{
                        display: 'inline-block', marginTop: 6, fontSize: 10, fontWeight: 800,
                        color: C.statusWarn, background: alpha(C.statusWarn, 14),
                        padding: '2px 9px', borderRadius: 8,
                      }}>در انتظار تایید مالک</span>
                    )}
                  </div>
                  <ChevronLeftIcon size={16} color={C.subtle} />
                </div>
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
          <div style={{ fontSize: 12, color: C.statusExpired, background: alpha(C.statusExpired, 10), border: `1px solid ${alpha(C.statusExpired, 20)}`, borderRadius: 11, padding: '10px 14px' }}>
            {error}
          </div>
        )}

        <Button type="submit" loading={loading} fullWidth size="lg" icon={<CheckIcon size={16} />}>ثبت ماشین</Button>
      </form>
    </Sheet>
  );
}
