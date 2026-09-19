'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import Chat from '@/components/Chat';
import { api, Conversation, toJalali } from '@/lib/api';
import { C, alpha, Button } from '@/components/ui';
import { Screen, ScreenHeader, Row, RowList, fa, SCREEN_CSS } from '@/components/ScreenKit';
import { MessageIcon, StoreIcon, CarIcon } from '@/components/icons';

/**
 * گفتگوها.
 *
 * A conversation list is read by scanning for what is unanswered, so unread is
 * the loudest thing on a row and unread rows carry the accent rail. The card
 * used to hold a click handler on an inner div, which meant the row could be
 * tapped but never focused or reached by keyboard.
 */
export default function MessagesPage() {
  const router = useRouter();
  const [role, setRole] = useState<'owner' | 'mechanic'>('owner');
  const [list, setList] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Conversation | null>(null);

  const load = useCallback(() => {
    api.messages.conversations().then(setList).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!localStorage.getItem('vtoken')) { router.replace('/login?next=/messages'); return; }
    try { setRole(JSON.parse(localStorage.getItem('vuser') || '{}').role || 'owner'); } catch { /* no cached user */ }
    load();
    const id = setInterval(load, 15_000);
    return () => clearInterval(id);
  }, [router, load]);

  function openChat(c: Conversation) {
    setActive(c);
    setList((prev) => prev.map((it) =>
      it.vehicleId === c.vehicleId && it.mechanicId === c.mechanicId ? { ...it, unreadCount: 0 } : it));
  }

  const unreadTotal = list.reduce((n, c) => n + (c.unreadCount || 0), 0);

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar title="گفتگوها" back />
      <Screen>
        <ScreenHeader
          title="گفتگوها"
          subtitle={unreadTotal ? `${fa(unreadTotal)} پیام خوانده‌نشده` : 'همه‌ی پیام‌ها خوانده شده'}
          back={false}
        />

        {loading ? (
          <RowList>{[0, 1, 2].map((i) => <div key={i} className="ms-skel" style={{ background: C.fill2 }} />)}</RowList>
        ) : list.length === 0 ? (
          <div className="ms-empty" style={{ background: C.surfaceSolid, boxShadow: C.shadowSoft }}>
            <span style={{ background: alpha(C.green, 11), color: C.green }}><MessageIcon size={26} /></span>
            <b style={{ color: C.textStrong }}>گفتگویی نداری</b>
            <p style={{ color: C.muted }}>
              {role === 'owner'
                ? 'با تعمیرگاه‌هایی که به خودروهایت وصل‌اند می‌توانی همین‌جا حرف بزنی.'
                : 'با مالک خودروهایی که به تو دسترسی داده‌اند می‌توانی همین‌جا حرف بزنی.'}
            </p>
            {role === 'owner' && <Button onClick={() => router.push('/workshops')}>پیدا کردن تعمیرگاه</Button>}
          </div>
        ) : (
          <RowList>
            {list.map((c) => {
              const unread = c.unreadCount > 0;
              const car = [c.vehicle.make, c.vehicle.model].filter(Boolean).join(' ');
              return (
                <Row
                  key={`${c.vehicleId}:${c.mechanicId}`}
                  hue={unread ? C.green : C.fill4}
                  icon={role === 'owner' ? <StoreIcon size={19} /> : <CarIcon size={19} />}
                  title={c.counterpartName}
                  meta={
                    <span style={{ color: unread ? C.text : C.muted, fontWeight: unread ? 800 : 600 }}>
                      {c.lastMessage || 'هنوز پیامی رد و بدل نشده'}
                    </span>
                  }
                  chips={<span style={{ fontSize: 10.5, color: C.subtle }}>{car}{c.vehicle.plateNumber ? ` · ${c.vehicle.plateNumber}` : ''}</span>}
                  trailing={
                    <>
                      {c.lastMessageAt && (
                        <small style={{ fontSize: 10, color: C.subtle }}>{toJalali(c.lastMessageAt.slice(0, 10))}</small>
                      )}
                      {unread && (
                        <b style={{
                          minWidth: 21, height: 21, borderRadius: 11, padding: '0 6px',
                          background: `linear-gradient(135deg, ${C.green}, ${C.greenDark})`, color: C.onAccent,
                          fontSize: 10.5, fontWeight: 900, display: 'grid', placeItems: 'center',
                          boxShadow: C.shadowBrand,
                        }}>{c.unreadCount > 9 ? '+۹' : fa(c.unreadCount)}</b>
                      )}
                    </>
                  }
                  onClick={() => openChat(c)}
                />
              );
            })}
          </RowList>
        )}
      </Screen>

      {active && (
        <Chat
          vehicleId={active.vehicleId}
          mechanicId={active.mechanicId}
          role={role}
          title={`${active.counterpartName} · ${[active.vehicle.make, active.vehicle.model].filter(Boolean).join(' ')}`}
          onClose={() => { setActive(null); load(); }}
        />
      )}
      <BottomNav />

      <style jsx global>{SCREEN_CSS}</style>
      <style jsx>{`
        .ms-skel{height:74px;border-radius:18px;animation:msPulse 1.4s ease-in-out infinite}
        @keyframes msPulse{0%,100%{opacity:1}50%{opacity:.55}}
        .ms-empty{border-radius:22px;padding:32px 20px;text-align:center;display:grid;justify-items:center;gap:10px}
        .ms-empty>span{width:56px;height:56px;border-radius:18px;display:grid;place-items:center}
        .ms-empty b{font-size:15px;font-weight:900}
        .ms-empty p{margin:0 0 6px;font-size:12.5px;line-height:2;max-width:36ch}
      `}</style>
    </div>
  );
}
