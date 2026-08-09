'use client';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import { api, LiveDevice, TrackerProtocolInfo, TripSummary, Vehicle } from '@/lib/api';
import { C, Card, Button, Input, EmptyState, alpha } from '@/components/ui';
import { PinIcon, CarIcon, PlusIcon, NavigationIcon } from '@/components/icons';

const TrackingMap = dynamic(() => import('@/components/TrackingMapInner'), {
  ssr: false,
  loading: () => (
    <div style={{ height: 420, borderRadius: 18, background: C.surface2, border: `1px solid ${C.border}` }} />
  ),
});

const STATUS_LABEL: Record<string, string> = {
  online: 'آنلاین',
  offline: 'آفلاین',
  unknown: 'بدون گزارش',
};

function statusColour(status: string): string {
  return status === 'online' ? C.green : status === 'offline' ? C.statusNeutral : C.amber;
}

/** "۳ دقیقه پیش" — an absolute timestamp makes nobody do the subtraction. */
function relativeTime(iso: string | null): string {
  if (!iso) return 'هرگز';
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'همین حالا';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} دقیقه پیش`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} ساعت پیش`;
  return `${Math.floor(seconds / 86400)} روز پیش`;
}

/** `Input` is a bare passthrough, so labels are wrapped here rather than by it. */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ color: C.muted, fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function startOfToday(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export default function TrackingPage() {
  const [devices, setDevices] = useState<LiveDevice[]>([]);
  const [protocols, setProtocols] = useState<TrackerProtocolInfo[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [trail, setTrail] = useState<Array<[number, number]>>([]);
  const [summary, setSummary] = useState<TripSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [streamLive, setStreamLive] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState('');

  const selected = useMemo(() => devices.find((d) => d.id === selectedId) ?? null, [devices, selectedId]);

  // The stream subscription is created once, so it reads the current
  // selection through a ref — closing over the state value would freeze it at
  // whatever was selected when the page loaded.
  const selectedIdRef = useRef<string | null>(null);
  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);

  // --- initial load ---------------------------------------------------------

  const load = useCallback(async () => {
    try {
      const [live, protocolList, vehicleList] = await Promise.all([
        api.tracking.live(),
        api.tracking.protocols(),
        api.vehicles.list().catch(() => []),
      ]);
      setDevices(live);
      setProtocols(protocolList);
      setVehicles(vehicleList);
      setSelectedId((current) => current ?? live.find((d) => d.lat != null)?.id ?? null);
    } catch (err: any) {
      setError(err?.message || 'دریافت اطلاعات ناموفق بود');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // --- live stream ----------------------------------------------------------

  useEffect(() => {
    const source = new EventSource(api.tracking.streamUrl());

    source.onopen = () => setStreamLive(true);

    source.onmessage = (event) => {
      let payload: any;
      try {
        payload = JSON.parse(event.data);
      } catch {
        return;
      }
      if (payload.type !== 'position') return;

      setDevices((current) => {
        const index = current.findIndex((d) => d.id === payload.deviceId);
        const next: LiveDevice = {
          ...(index >= 0 ? current[index] : ({} as LiveDevice)),
          id: payload.deviceId,
          uniqueId: payload.uniqueId,
          name: payload.name,
          lat: payload.lat,
          lng: payload.lng,
          speed: payload.speed,
          course: payload.course,
          fixAt: payload.fixAt,
          lastSeenAt: new Date().toISOString(),
          status: 'online',
        };
        if (index < 0) return [next, ...current];
        const copy = [...current];
        copy[index] = next;
        return copy;
      });

      // Extend the drawn route as the selected vehicle moves, so the live
      // trail and the loaded history are the same line.
      setTrail((current) =>
        payload.deviceId === selectedIdRef.current ? [...current, [payload.lat, payload.lng]] : current,
      );
    };

    // The browser reconnects on its own; this only reflects the gap in the UI
    // so a stalled map is never mistaken for a stationary fleet.
    source.onerror = () => setStreamLive(false);

    return () => source.close();
  }, []);

  // --- history for the selected device --------------------------------------

  useEffect(() => {
    if (!selectedId) { setTrail([]); setSummary(null); return; }
    let cancelled = false;

    (async () => {
      const from = startOfToday();
      const to = new Date().toISOString();
      try {
        const [positions, trip] = await Promise.all([
          api.tracking.history(selectedId, from, to),
          api.tracking.summary(selectedId, from, to),
        ]);
        if (cancelled) return;
        setTrail(positions.filter((p) => p.valid).map((p) => [p.lat, p.lng] as [number, number]));
        setSummary(trip);
      } catch {
        if (!cancelled) { setTrail([]); setSummary(null); }
      }
    })();

    return () => { cancelled = true; };
  }, [selectedId]);

  // --- render ---------------------------------------------------------------

  const mapDevices = useMemo(
    () => devices.map((d) => ({
      id: d.id,
      name: d.name,
      uniqueId: d.uniqueId,
      lat: d.lat,
      lng: d.lng,
      course: d.course,
      speed: d.speed,
      status: d.status,
    })),
    [devices],
  );

  return (
    <>
      <Navbar />
      <main style={{ padding: '16px 16px 96px', maxWidth: 1100, margin: '0 auto' }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
          <div>
            <h1 style={{ color: C.textStrong, fontSize: 20, fontWeight: 800, margin: 0 }}>ردیابی زنده</h1>
            <p style={{ color: C.muted, fontSize: 12.5, margin: '5px 0 0', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                width: 7, height: 7, borderRadius: '50%',
                background: streamLive ? C.green : C.statusNeutral,
                boxShadow: streamLive ? `0 0 0 3px ${alpha(C.green, 20)}` : undefined,
              }} />
              {streamLive ? 'اتصال زنده برقرار است' : 'در انتظار اتصال زنده'}
            </p>
          </div>
          <Button size="sm" icon={<PlusIcon size={15} />} onClick={() => setShowAdd((v) => !v)}>
            افزودن ردیاب
          </Button>
        </header>

        {error && (
          <Card style={{ marginBottom: 12, borderColor: alpha(C.red, 40) }}>
            <p style={{ color: C.red, fontSize: 13, margin: 0 }}>{error}</p>
          </Card>
        )}

        {showAdd && (
          <AddDeviceForm
            protocols={protocols}
            vehicles={vehicles}
            onDone={() => { setShowAdd(false); void load(); }}
          />
        )}

        {loading ? (
          <div style={{ height: 420, borderRadius: 18, background: C.surface2, border: `1px solid ${C.border}` }} />
        ) : devices.length === 0 ? (
          <EmptyState
            icon={<PinIcon size={26} />}
            title="هنوز ردیابی ثبت نشده"
            sub="شناسه (IMEI) ردیاب را وارد کنید تا موقعیت خودرو روی نقشه دیده شود."
            onAdd={() => setShowAdd(true)}
            btnLabel="افزودن ردیاب"
          />
        ) : (
          <>
            <TrackingMap
              devices={mapDevices}
              selectedId={selectedId}
              trail={trail}
              onSelect={setSelectedId}
              height={420}
            />

            {selected && <SelectedSummary device={selected} summary={summary} />}

            <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
              {devices.map((device) => (
                <DeviceRow
                  key={device.id}
                  device={device}
                  selected={device.id === selectedId}
                  onSelect={() => setSelectedId(device.id)}
                />
              ))}
            </div>
          </>
        )}
      </main>
      <BottomNav />
    </>
  );
}

function SelectedSummary({ device, summary }: { device: LiveDevice; summary: TripSummary | null }) {
  const stats = [
    { label: 'مسافت امروز', value: summary ? `${summary.distanceKm} کیلومتر` : '—' },
    { label: 'زمان حرکت', value: summary ? `${summary.movingMinutes} دقیقه` : '—' },
    { label: 'بیشترین سرعت', value: summary ? `${summary.maxSpeed} km/h` : '—' },
    { label: 'سرعت فعلی', value: `${Math.round(device.speed ?? 0)} km/h` },
  ];

  return (
    <Card style={{ marginTop: 12 }} padding="14px 16px">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <NavigationIcon size={16} />
        <p style={{ color: C.text, fontSize: 14, fontWeight: 800, margin: 0 }}>{device.name || device.uniqueId}</p>
      </div>
      {device.address && (
        <p style={{ color: C.muted, fontSize: 12.5, margin: '0 0 12px' }}>{device.address}</p>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
        {stats.map((stat) => (
          <div key={stat.label} style={{ background: C.fill1, borderRadius: 12, padding: '10px 12px' }}>
            <p style={{ color: C.muted, fontSize: 11, margin: 0 }}>{stat.label}</p>
            <p style={{ color: C.text, fontSize: 14, fontWeight: 800, margin: '4px 0 0' }}>{stat.value}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function DeviceRow({ device, selected, onSelect }: { device: LiveDevice; selected: boolean; onSelect: () => void }) {
  const colour = statusColour(device.status);

  return (
    <Card
      onClick={onSelect}
      ariaLabel={`انتخاب ${device.name || device.uniqueId}`}
      padding="12px 14px"
      style={{ borderColor: selected ? alpha(C.green, 45) : C.border, cursor: 'pointer' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 13, flexShrink: 0,
          background: alpha(colour, 13), border: `1px solid ${alpha(colour, 27)}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: colour,
        }}>
          <CarIcon size={20} />
        </div>

        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ color: C.text, fontSize: 14, fontWeight: 800, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {device.name || device.uniqueId}
          </p>
          <p style={{ color: C.muted, fontSize: 11.5, margin: '4px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {device.address || 'موقعیتی ثبت نشده'}
          </p>
        </div>

        <div style={{ textAlign: 'left', flexShrink: 0 }}>
          <span style={{
            fontSize: 10.5, fontWeight: 700, color: colour,
            background: alpha(colour, 13), border: `1px solid ${alpha(colour, 27)}`,
            borderRadius: 999, padding: '3px 9px', display: 'inline-block',
          }}>
            {STATUS_LABEL[device.status]}
          </span>
          <p style={{ color: C.subtle, fontSize: 10.5, margin: '5px 0 0' }}>{relativeTime(device.lastSeenAt)}</p>
        </div>
      </div>
    </Card>
  );
}

function AddDeviceForm({
  protocols, vehicles, onDone,
}: {
  protocols: TrackerProtocolInfo[];
  vehicles: Vehicle[];
  onDone: () => void;
}) {
  const [uniqueId, setUniqueId] = useState('');
  const [name, setName] = useState('');
  const [protocol, setProtocol] = useState('gt06');
  const [vehicleId, setVehicleId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const supported = protocols.filter((p) => p.implemented);
  const chosen = protocols.find((p) => p.key === protocol);

  const submit = async () => {
    setError('');
    setSaving(true);
    try {
      await api.tracking.claim({
        uniqueId: uniqueId.trim(),
        name: name.trim() || undefined,
        protocol,
        vehicleId: vehicleId || undefined,
      });
      onDone();
    } catch (err: any) {
      setError(err?.message || 'ثبت ردیاب ناموفق بود');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card style={{ marginBottom: 14 }} padding="16px 18px">
      <p style={{ color: C.text, fontSize: 14, fontWeight: 800, margin: '0 0 12px' }}>افزودن ردیاب</p>

      <div style={{ display: 'grid', gap: 10 }}>
        <Field label="شناسه دستگاه (IMEI)">
          <Input
            value={uniqueId}
            onChange={(e) => setUniqueId(e.target.value)}
            placeholder="روی بدنه دستگاه چاپ شده است"
            inputMode="numeric"
          />
        </Field>

        <Field label="نام (اختیاری)">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلاً پژو ۲۰۶ آقای رضایی" />
        </Field>

        <Field label="نوع ردیاب">
          <select
            value={protocol}
            onChange={(e) => setProtocol(e.target.value)}
            style={{
              width: '100%', padding: '11px 12px', borderRadius: 12,
              background: C.surface2, border: `1px solid ${C.border}`, color: C.text, fontSize: 13.5,
            }}
          >
            {supported.map((p) => (
              <option key={p.key} value={p.key}>{p.label}</option>
            ))}
          </select>
          {chosen && (
            <p style={{ color: C.subtle, fontSize: 11, margin: '6px 0 0', lineHeight: 1.7 }}>
              مدل‌های سازگار: {chosen.brands.join('، ')}
              {chosen.transport === 'tcp' && (
                <>
                  <br />
                  آدرس سرور برای تنظیم با پیامک: <span style={{ color: C.text2, fontWeight: 700 }}>95.38.186.215:{chosen.port}</span>
                </>
              )}
            </p>
          )}
        </Field>

        {vehicles.length > 0 && (
          <Field label="اتصال به خودرو (اختیاری)">
            <select
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              style={{
                width: '100%', padding: '11px 12px', borderRadius: 12,
                background: C.surface2, border: `1px solid ${C.border}`, color: C.text, fontSize: 13.5,
              }}
            >
              <option value="">— انتخاب نشده —</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>{v.make} {v.model}{v.plateNumber ? ` · ${v.plateNumber}` : ''}</option>
              ))}
            </select>
          </Field>
        )}

        {error && <p style={{ color: C.red, fontSize: 12.5, margin: 0 }}>{error}</p>}

        <Button onClick={submit} loading={saving} disabled={uniqueId.trim().length < 6} fullWidth>
          ثبت ردیاب
        </Button>
      </div>
    </Card>
  );
}
