'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import { api, Vehicle, COLORS_HEX, daysUntil, expiryStatus } from '@/lib/api';
import { C, Input, EmptyState, Skeleton } from '@/components/ui';
import {
  CarIcon, PlusIcon, SearchIcon, ChevronLeftIcon, RoadIcon, FuelIcon,
  AlertTriangleIcon, CheckIcon,
} from '@/components/icons';

function VehicleCard({ v }: { v: Vehicle }) {
  const insDays  = daysUntil(v.insuranceExpiry);
  const tecDays  = daysUntil(v.technicalExpiry);
  const hasAlert = expiryStatus(insDays) !== 'ok' || expiryStatus(tecDays) !== 'ok';
  const dotColor = COLORS_HEX[v.color || ''] || C.green;
  const accent   = hasAlert ? '#F87171' : C.green;

  return (
    <Link href={`/vehicles/${v.id}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 22,
        overflow: 'hidden',
        boxShadow: '0 4px 18px rgba(0,0,0,0.20)',
        transition: 'transform 0.15s, box-shadow 0.15s',
      }}>
        <div style={{
          height: 4,
          background: `linear-gradient(90deg, ${dotColor}, ${dotColor}30)`,
        }} />
        <div style={{ padding: '16px 16px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 15, flexShrink: 0,
                background: `${dotColor}22`, border: `1px solid ${dotColor}45`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: dotColor,
              }}><CarIcon size={22} /></div>
              <div style={{ minWidth: 0 }}>
                <p style={{ color: C.text, fontSize: 15, fontWeight: 800, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {v.make} {v.model}
                </p>
                <p style={{ color: C.muted, fontSize: 12, fontWeight: 500, margin: '4px 0 0' }}>
                  سال {v.year}{v.color ? ` · ${v.color}` : ''}
                </p>
              </div>
            </div>
            <ChevronLeftIcon size={16} color={C.subtle} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            {v.plateNumber && (
              <span style={{
                background: 'rgba(255,255,255,0.06)',
                border: `1px solid ${C.border}`,
                color: C.muted, fontSize: 11,
                padding: '4px 10px', borderRadius: 8,
                fontFamily: 'monospace', direction: 'ltr',
              }}>{v.plateNumber}</span>
            )}
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: C.muted, fontSize: 11.5, fontWeight: 600 }}>
              <RoadIcon size={12} /> {v.currentMileage.toLocaleString()} km
            </span>
            {v.fuelType && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: C.muted, fontSize: 11.5, fontWeight: 600 }}>
                <FuelIcon size={12} /> {v.fuelType}
              </span>
            )}
          </div>

          <div style={{
            marginTop: 12, paddingTop: 12, borderTop: `1px dashed ${C.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: 11.5, fontWeight: 700, color: accent,
            }}>
              {hasAlert ? <AlertTriangleIcon size={13} /> : <CheckIcon size={13} />}
              {hasAlert ? 'نیاز به توجه' : 'وضعیت سالم'}
            </span>
            <span style={{ fontSize: 11, color: C.subtle, fontWeight: 500 }}>
              {(v.serviceRecords?.length ?? 0)} سرویس ثبت‌شده
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function VehiclesListPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading]   = useState(true);
  const [q, setQ] = useState('');

  useEffect(() => {
    if (!localStorage.getItem('vtoken')) { router.replace('/'); return; }
    api.vehicles.list().then(setVehicles).finally(() => setLoading(false));
  }, [router]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return vehicles;
    return vehicles.filter(v =>
      `${v.make} ${v.model} ${v.plateNumber || ''}`.toLowerCase().includes(term)
    );
  }, [vehicles, q]);

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar title="خودروهای من" />
      <main style={{ maxWidth: 560, margin: '0 auto', padding: '0 16px calc(88px + env(safe-area-inset-bottom))' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 0 14px' }}>
          <h1 style={{ color: C.text, fontSize: 21, fontWeight: 900, margin: 0 }}>
            خودروهای من
            {!loading && (
              <span style={{ fontSize: 13, color: C.muted, fontWeight: 600, marginRight: 8 }}>
                ({vehicles.length})
              </span>
            )}
          </h1>
          <Link href="/vehicles/new" style={{
            display: 'flex', alignItems: 'center', gap: 5,
            color: 'white', fontSize: 13, fontWeight: 700, textDecoration: 'none',
            background: `linear-gradient(135deg, ${C.green}, ${C.greenDark})`,
            borderRadius: 12, padding: '9px 15px',
            boxShadow: `0 4px 16px ${C.greenGlow}`,
          }}>
            <PlusIcon size={14} /> افزودن
          </Link>
        </div>

        {vehicles.length > 0 && (
          <div style={{ marginBottom: 16, position: 'relative' }}>
            <div style={{ position: 'absolute', top: '50%', right: 14, transform: 'translateY(-50%)', color: C.subtle, pointerEvents: 'none' }}>
              <SearchIcon size={15} />
            </div>
            <Input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="جستجو بر اساس مدل یا پلاک..."
              style={{ paddingRight: 38 }}
            />
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 22, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Skeleton height={48} width={48} radius={15} />
                  <div style={{ flex: 1 }}>
                    <Skeleton height={14} width="60%" />
                    <div style={{ marginTop: 8 }}><Skeleton height={11} width="40%" /></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : vehicles.length === 0 ? (
          <EmptyState
            icon={<CarIcon size={30} />}
            title="هنوز خودرویی ثبت نکردی"
            sub="اولین خودروت رو اضافه کن تا سرویس، بیمه و مدارکش رو مدیریت کنی"
            onAdd={() => router.push('/vehicles/new')}
            btnLabel="افزودن خودرو"
          />
        ) : filtered.length === 0 ? (
          <EmptyState icon={<SearchIcon size={26} />} title="خودرویی پیدا نشد" sub="عبارت جستجو رو تغییر بده" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map(v => <VehicleCard key={v.id} v={v} />)}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
