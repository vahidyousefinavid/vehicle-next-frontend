'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import NeshanMap from '@/components/NeshanMap';
import InteractiveMapPicker from '@/components/InteractiveMapPicker';
import PushToggle from '@/components/PushToggle';
import SmsToggle from '@/components/SmsToggle';
import {
  UserIcon, LogOutIcon, CarIcon, ChevronLeftIcon, WrenchIcon,
  StoreIcon, CalendarIcon, BoxIcon, UsersIcon, CompassIcon, MessageIcon, SettingsIcon, PinIcon,
  BellIcon, WalletIcon,
  SparklesIcon,
} from '@/components/icons';
import { C, Card, Button, alpha} from '@/components/ui';
import { api } from '@/lib/api';
import { getToken, getUser, refreshUser, clearSession } from '@/lib/session';
import type { User } from '@/lib/api';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!getToken()) { router.replace('/'); return; }
    // show the cached profile immediately, then reconcile with the server —
    // the cached copy is written at login and otherwise never refreshed
    setUser(getUser());
    refreshUser().then((u) => u && setUser(u));
  }, [router]);

  function logout() {
    clearSession();
    router.push('/');
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar title="پروفایل" />

      <main style={{ maxWidth: 520, margin: '0 auto', padding: '20px 16px calc(96px + env(safe-area-inset-bottom))' }}>

        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
          padding: '28px 20px', marginBottom: 20,
          textAlign: 'center',
        }}>
          <div style={{
            width: 76, height: 76, borderRadius: '50%',
            background: `linear-gradient(135deg, ${C.green}, ${C.greenDark})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: C.onAccent, boxShadow: `0 10px 30px ${C.greenGlow}`,
          }}>
            <UserIcon size={34} />
          </div>
          <div>
            <p style={{ color: C.textStrong, fontSize: 18, fontWeight: 950, margin: 0 }}>
              {(user?.role === 'mechanic' || user?.role === 'seller') ? (user?.workshopName || 'کاربر') : (user?.name || 'کاربر مهمان')}
            </p>
            {(user?.role === 'mechanic' || user?.role === 'seller') && (
              <p style={{ color: C.subtle, fontSize: 12, fontWeight: 500, margin: '3px 0 0' }}>{user?.name}</p>
            )}
            <p style={{ color: C.muted, fontSize: 13, fontWeight: 600, margin: '4px 0 0' }}>
              <bdi dir="ltr">{user?.phone || ''}</bdi>
            </p>
            {user?.role && (
              <span className="pf-role" style={{ background: alpha(C.green, 12), color: C.green }}>
                {user.role === 'mechanic' ? 'تعمیرگاه' : user.role === 'seller' ? 'فروشنده' : 'مالک خودرو'}
              </span>
            )}
          </div>
        </div>

        {user?.role === 'mechanic' ? (
          <>
            <Card style={{ marginBottom: 12 }} padding="4px">
              <MenuRow icon={<SparklesIcon size={18} />} label="درخواست‌های باز" hint="کار تازه بردار" hue="var(--svc-tuning)" onClick={() => router.push('/mechanic/requests')} />
              <MenuRow icon={<WrenchIcon size={18} />} label="خودروهای متصل" hue="var(--svc-oil)" onClick={() => router.push('/mechanic')} />
              <MenuRow icon={<UsersIcon size={18} />} label="مشتری‌های من" hue="var(--svc-filter)" onClick={() => router.push('/mechanic/customers')} />
              <MenuRow icon={<WalletIcon size={18} />} label="حسابداری و درآمد" hue="var(--svc-gearbox)" onClick={() => router.push('/mechanic/accounting')} />
              <MenuRow icon={<BoxIcon size={18} />} label="کاتالوگ قطعات" hue="var(--svc-tire)" onClick={() => router.push('/mechanic/parts')} />
              <MenuRow icon={<CalendarIcon size={18} />} label="نوبت‌ها" hue="var(--svc-filter)" onClick={() => router.push('/appointments')} />
              <MenuRow icon={<SettingsIcon size={18} />} label="خدمات من" hue="var(--svc-plug)" onClick={() => router.push('/mechanic/services')} />
              <MenuRow icon={<MessageIcon size={18} />} label="گفتگوها" hue="var(--svc-ac)" onClick={() => router.push('/messages')} />
              <MenuRow icon={<UsersIcon size={18} />} label="سازمان‌ها / ناوگان" hue="var(--svc-gearbox)" onClick={() => router.push('/organizations')} />
            </Card>

            <div style={{ marginBottom: 12 }}>
              <WorkshopLocationCard user={user} onSaved={setUser} />
            </div>

            <div style={{ marginBottom: 12 }}>
              <SmsToggle user={user} onChange={setUser} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <PushToggle />
            </div>
          </>
        ) : user?.role === 'seller' ? (
          <>
            <Card style={{ marginBottom: 12 }} padding="4px">
              <MenuRow icon={<BoxIcon size={18} />} label="محصولات من" hue="var(--svc-tire)" onClick={() => router.push('/seller/products')} />
              <MenuRow icon={<WrenchIcon size={18} />} label="ثبت و سابقه فروش" hue="var(--svc-oil)" onClick={() => router.push('/seller/sales')} />
              <MenuRow icon={<WalletIcon size={18} />} label="حسابداری و مشتری‌ها" hue="var(--svc-gearbox)" onClick={() => router.push('/seller/accounting')} />
            </Card>

            <div style={{ marginBottom: 12 }}>
              <WorkshopLocationCard user={user} onSaved={setUser} />
            </div>

            <div style={{ marginBottom: 12 }}>
              <SmsToggle user={user} onChange={setUser} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <PushToggle />
            </div>
          </>
        ) : (
          <>
            <Card style={{ marginBottom: 12 }} padding="4px">
              <MenuRow icon={<CarIcon size={18} />} label="خودروهای من" hint="مدارک و سوابق" hue="var(--svc-tire)" onClick={() => router.push('/dashboard')} />
              <MenuRow icon={<SparklesIcon size={18} />} label="درخواست‌های من" hint="پیشنهاد تعمیرگاه‌ها" hue="var(--svc-tuning)" onClick={() => router.push('/requests')} />
              <MenuRow icon={<BellIcon size={18} />} label="یادآورها و سررسیدها" hue="var(--svc-battery)" onClick={() => router.push('/reminders')} />
              <MenuRow icon={<WalletIcon size={18} />} label="هزینه‌ها" hue="var(--svc-oil)" onClick={() => router.push('/expenses')} />
              <MenuRow icon={<CalendarIcon size={18} />} label="نوبت‌های من" hue="var(--svc-filter)" onClick={() => router.push('/appointments')} />
              <MenuRow icon={<StoreIcon size={18} />} label="پیدا کردن تعمیرگاه" hue="var(--svc-brake)" onClick={() => router.push('/workshops')} />
              <MenuRow icon={<MessageIcon size={18} />} label="گفتگوها" hue="var(--svc-ac)" onClick={() => router.push('/messages')} />
              <MenuRow icon={<UsersIcon size={18} />} label="سازمان‌ها / ناوگان" hue="var(--svc-gearbox)" onClick={() => router.push('/organizations')} />
            </Card>

            {user && (
              <div style={{ marginBottom: 12 }}>
                <SmsToggle user={user} onChange={setUser} />
              </div>
            )}

            <div style={{ marginBottom: 20 }}>
              <PushToggle />
            </div>
          </>
        )}

        <button
          onClick={logout}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: alpha(C.statusExpired, 10), color: C.statusExpired,
            border: `1px solid ${alpha(C.statusExpired, 22)}`,
            borderRadius: 16, padding: '13px', fontSize: 14, fontWeight: 700,
            fontFamily: 'var(--font-sans)',
          }}
        >
          <LogOutIcon size={17} />
          خروج از حساب
        </button>

        <p style={{ textAlign: 'center', color: C.subtle, fontSize: 11, marginTop: 24 }}>
          دستیار خودرو · نسخه ۱٫۰٫۰
        </p>
      </main>

      <BottomNav />

      {/* `.pf-row` / `.pf-ico` / `.pf-txt` are rendered by <MenuRow>, a sibling
          component — and <style jsx> scopes per component, not per file, so
          those rules only match once they opt out with :global(). `.pf-role`
          is rendered here, so it stays scoped. */}
      <style jsx>{`
        :global(.pf-row){
          width:100%;display:flex;align-items:center;gap:12px;
          padding:12px 13px;background:transparent;border:0;cursor:pointer;
          font-family:var(--font-sans);border-radius:14px;
          transition:background var(--dur-move,260ms) var(--ease-soft,ease),transform var(--dur-press,120ms) var(--ease-soft,ease);
        }
        :global(.pf-row:active){transform:scale(.985);background:var(--fill-1)}
        :global(.pf-row:focus-visible){outline:2px solid var(--brand);outline-offset:-2px}
        @media (hover:hover){ :global(.pf-row:hover){background:var(--fill-1)} }
        :global(.pf-ico){width:36px;height:36px;border-radius:12px;display:grid;place-items:center;flex-shrink:0;
                transition:transform var(--dur-move,260ms) var(--ease-spring,ease)}
        :global(.pf-row:active .pf-ico){transform:scale(.93)}
        :global(.pf-txt){flex:1;min-width:0;text-align:start}
        :global(.pf-txt b){display:block;font-size:13.5px;font-weight:800;line-height:1.4}
        :global(.pf-txt small){display:block;font-size:10.5px;margin-top:2px;line-height:1.5}
        .pf-role{display:inline-block;margin-top:9px;font-size:11px;font-weight:900;
                 border-radius:999px;padding:5px 12px}
        @media (prefers-reduced-motion: reduce){ :global(.pf-row:active),:global(.pf-row:active .pf-ico){transform:none} }
      `}</style>
    </div>
  );
}

function WorkshopLocationCard({ user, onSaved }: { user: User; onSaved: (u: User) => void }) {
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    user.workshopLat != null && user.workshopLng != null ? { lat: user.workshopLat, lng: user.workshopLng } : null,
  );
  const [error, setError] = useState('');

  function locate() {
    if (!navigator.geolocation) return;
    setLocating(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocating(false); },
      () => { setError('دریافت موقعیت مکانی ناموفق بود'); setLocating(false); },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  async function save() {
    if (!coords) return;
    setSaving(true);
    setError('');
    try {
      const updated = await api.auth.updateProfile({ workshopLat: coords.lat, workshopLng: coords.lng });
      localStorage.setItem('vuser', JSON.stringify(updated));
      onSaved(updated);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <p style={{ fontSize: 12.5, fontWeight: 800, color: C.text, margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <StoreIcon size={15} /> موقعیت {user.role === 'seller' ? 'فروشگاه' : 'تعمیرگاه'} روی نقشه
      </p>
      <div style={{ marginBottom: 10 }}>
        <NeshanMap lat={coords?.lat} lng={coords?.lng} height={140} onOpenPicker={() => setShowPicker(true)} />
      </div>
      {error && <p style={{ fontSize: 11, color: C.statusExpired, margin: '0 0 8px' }}>{error}</p>}
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <Button variant="secondary" fullWidth loading={locating} onClick={locate} icon={<CompassIcon size={14} />}>موقعیت فعلی من</Button>
        <Button variant="secondary" fullWidth onClick={() => setShowPicker(true)} icon={<PinIcon size={14} />}>انتخاب روی نقشه</Button>
      </div>
      <Button fullWidth disabled={!coords} loading={saving} onClick={save}>ذخیره موقعیت</Button>

      {showPicker && (
        <InteractiveMapPicker
          lat={coords?.lat}
          lng={coords?.lng}
          onConfirm={(lat, lng) => { setCoords({ lat, lng }); setShowPicker(false); }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </Card>
  );
}

/**
 * One line of the profile menu.
 *
 * Every row used to carry the same green glyph, so the list was a wall of
 * identical ticks and you navigated it by reading every label. Each entry has
 * its own hue on a plate now, which is how the rest of the app is scanned, and
 * the row reacts to a press — before, nothing on this screen moved under a
 * finger.
 */
function MenuRow({
  icon, label, hint, hue = C.green, onClick,
}: { icon: React.ReactNode; label: string; hint?: string; hue?: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="pf-row" style={{ ['--pf-hue' as string]: hue }}>
      <span className="pf-ico" style={{ background: alpha(hue, 12), color: hue }}>{icon}</span>
      <span className="pf-txt">
        <b style={{ color: C.text }}>{label}</b>
        {hint && <small style={{ color: C.subtle }}>{hint}</small>}
      </span>
      <ChevronLeftIcon size={16} color={C.subtle} />
    </button>
  );
}
