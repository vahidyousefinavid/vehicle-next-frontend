'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import { api, Vehicle, COLORS_HEX, daysUntil, expiryStatus } from '@/lib/api';
import { C, EmptyState, Skeleton, alpha, Button } from '@/components/ui';
import {
  Screen, ScreenHeader, Glance, Row, RowList, Chip, SearchBar, SCREEN_CSS, fa,
} from '@/components/ScreenKit';
import { CarIcon, PlusIcon, RoadIcon, AlertTriangleIcon, CheckIcon, ShieldIcon } from '@/components/icons';

/** The soonest of a car's two expiries is what decides how urgent it looks. */
function urgency(v: Vehicle) {
  const days = [daysUntil(v.insuranceExpiry), daysUntil(v.technicalExpiry)]
    .filter((d): d is number => d !== null);
  const worst = days.length ? Math.min(...days) : null;
  const status = [expiryStatus(daysUntil(v.insuranceExpiry)), expiryStatus(daysUntil(v.technicalExpiry))];
  const bad = status.find((s) => s !== 'ok');
  return { worst, bad };
}

export default function VehiclesListPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  useEffect(() => {
    if (!localStorage.getItem('vtoken')) { router.replace('/'); return; }
    api.vehicles.list().then(setVehicles).finally(() => setLoading(false));
  }, [router]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return vehicles;
    return vehicles.filter((v) => `${v.make} ${v.model} ${v.plateNumber || ''}`.toLowerCase().includes(term));
  }, [vehicles, q]);

  /* the figures that answer "is anything wrong with my cars" */
  const needing = vehicles.filter((v) => urgency(v).bad).length;
  const soonest = vehicles
    .map((v) => urgency(v).worst)
    .filter((d): d is number => d !== null && d >= 0)
    .sort((a, b) => a - b)[0];
  const totalKm = vehicles.reduce((n, v) => n + (v.currentMileage || 0), 0);

  return (
    <Screen>
      <ScreenHeader
        eyebrow="گاراژ من"
        title="خودروهای من"
        subtitle={needing ? `${fa(needing)} خودرو مدرک نزدیک سررسید دارد` : 'مدارک همه خودروها به‌روز است'}
        back="/dashboard"
        action={<Link href="/vehicles/new"><Button size="sm" icon={<PlusIcon size={14} />}>افزودن</Button></Link>}
      />

      {!loading && vehicles.length > 0 && (
        <Glance items={[
          { label: 'خودرو', value: fa(vehicles.length) },
          { label: 'نیاز به رسیدگی', value: fa(needing), tone: needing ? C.statusExpired : C.statusOk, alert: needing > 0 },
          { label: 'نزدیک‌ترین سررسید', value: soonest === undefined ? '—' : `${fa(soonest)} روز`, tone: soonest !== undefined && soonest < 30 ? C.statusWarn : undefined },
          { label: 'مجموع کارکرد', value: fa(totalKm), hint: 'کیلومتر' },
        ]} />
      )}

      {vehicles.length > 3 && <SearchBar value={q} onChange={setQ} placeholder="مدل یا پلاک..." />}

      {loading ? (
        <RowList>{[0, 1, 2].map((i) => <Skeleton key={i} height={72} radius={18} />)}</RowList>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<CarIcon size={28} />}
          title={q ? 'خودرویی پیدا نشد' : 'هنوز خودرویی ثبت نکردی'}
          sub={q ? 'عبارت دیگری امتحان کن' : 'با ثبت خودرو، یادآوری مدارک و درخواست خدمت فعال می‌شود'}
          onAdd={q ? undefined : () => router.push('/vehicles/new')}
          btnLabel="افزودن خودرو"
        />
      ) : (
        <RowList>
          {filtered.map((v) => {
            const { worst, bad } = urgency(v);
            const hue = bad ? (bad === 'expired' ? C.statusExpired : C.statusWarn) : (COLORS_HEX[v.color || ''] || C.statusOk);
            return (
              <Row
                key={v.id}
                href={`/vehicles/${v.id}`}
                hue={hue}
                icon={<CarIcon size={21} />}
                title={`${v.make} ${v.model}`}
                meta={`${fa(v.year, { useGrouping: false })}${v.color ? ` · ${v.color}` : ''}`}
                chips={<>
                  {v.plateNumber && <Chip tone={C.text2}><span dir="ltr">{v.plateNumber}</span></Chip>}
                  <Chip tone={C.muted}><RoadIcon size={11} /> {fa(v.currentMileage)} km</Chip>
                  {bad
                    ? <Chip tone={hue}><AlertTriangleIcon size={11} /> {worst !== null && worst >= 0 ? `${fa(worst)} روز تا سررسید` : 'مدرک منقضی'}</Chip>
                    : <Chip tone={C.statusOk}><CheckIcon size={11} /> مدارک به‌روز</Chip>}
                </>}
              />
            );
          })}
        </RowList>
      )}

      <Link href="/reminders" className="veh-tip" style={{ background: alpha(C.green, 8), color: C.green }}>
        <ShieldIcon size={15} />
        یادآور بگذار تا قبل از سررسید بیمه و معاینه خبردار شوی
      </Link>

      <BottomNav />
      <style>{SCREEN_CSS + `
.veh-tip{display:flex;align-items:center;gap:8px;border-radius:16px;padding:13px 15px;margin-top:16px;font:800 12px var(--font-sans);text-decoration:none;line-height:1.6}
      `}</style>
    </Screen>
  );
}
