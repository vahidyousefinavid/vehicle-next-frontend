'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, AppNotification } from '@/lib/api';
import { relativeTime } from '@/lib/when';
import { C, alpha, Button, EmptyState, Spinner, IconBadge } from './ui';
import { metaFor } from './notificationMeta';
import { BellIcon, CheckIcon, XIcon } from './icons';

/** How many the dropdown holds. The rest is what the page is for. */
const GLANCE = 8;

export default function NotificationsBell() {
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(false);
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);

  /** The one that just arrived, shown as a card for a few seconds. */
  const [toast, setToast] = useState<AppNotification | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(() => {
    if (!localStorage.getItem('vtoken')) return;
    api.notifications.unreadCount().then(r => setCount(r.count)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoggedIn(!!localStorage.getItem('vtoken'));
    refresh();
  }, [refresh]);

  /* ── the live stream ──────────────────────────────────────────────────────
     Replaces a 30-second poll. The badge used to be up to half a minute stale
     and every open tab asked the API whether anything had happened, forever,
     whether or not it had. This costs one held-open connection and the event
     lands in about a second. */
  useEffect(() => {
    if (!loggedIn || typeof window === 'undefined' || !('EventSource' in window)) return;

    let source: EventSource | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;
    let stopped = false;

    const connect = () => {
      if (stopped) return;
      source = new EventSource(api.notifications.streamUrl());

      source.addEventListener('open', () => { attempt = 0; });

      source.addEventListener('notification', (e) => {
        try {
          const note: AppNotification = JSON.parse((e as MessageEvent).data);
          setItems(prev => [note, ...prev.filter(p => p.id !== note.id)].slice(0, GLANCE));
          setCount(n => n + 1);

          setToast(note);
          if (toastTimer.current) clearTimeout(toastTimer.current);
          toastTimer.current = setTimeout(() => setToast(null), 6000);
        } catch {
          // A malformed frame is not a reason to drop the stream.
        }
      });

      source.addEventListener('error', () => {
        source?.close();
        if (stopped) return;
        // Back off rather than hammer: a dropped stream is usually a phone's
        // network coming and going, and the server is not the problem.
        attempt += 1;
        retry = setTimeout(connect, Math.min(30_000, 2_000 * attempt));
      });
    };

    connect();

    return () => {
      stopped = true;
      if (retry) clearTimeout(retry);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      source?.close();
    };
  }, [loggedIn]);

  /**
   * A tab left open in the background gets its stream closed by the browser or
   * the network without an error the page can see. Coming back to it is the
   * one moment the badge is most likely to be wrong, so it is re-checked then.
   */
  useEffect(() => {
    if (!loggedIn) return;
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [loggedIn, refresh]);

  async function toggle() {
    if (open) { setOpen(false); return; }

    setOpen(true);
    setToast(null);
    setLoading(true);

    /* Fetch first, clear the badge second, in that order and not together.
       Opening the bell is having seen them, so the badge should empty — but
       the list you are looking at keeps the `read` values it was fetched with,
       so which ones were new is still visible. Firing both at once let the
       mark-read land first often enough that everything came back already
       read, which erased the highlight the ordering exists to protect. */
    try {
      const list = await api.notifications.list();
      setItems(list.slice(0, GLANCE));
    } finally {
      setLoading(false);
    }

    if (count > 0) {
      api.notifications.read().then(r => setCount(r.unread)).catch(() => setCount(0));
    }
  }

  function go(n: AppNotification) {
    setOpen(false);
    setToast(null);
    if (n.url) router.push(n.url);
  }

  async function act(n: AppNotification, kind: 'confirm' | 'reject') {
    setActingId(n.id);
    try {
      const updated = kind === 'confirm' ? await api.notifications.confirm(n.id) : await api.notifications.reject(n.id);
      setItems(prev => prev.map(it => (it.id === n.id ? updated : it)));
      refresh();
    } finally {
      setActingId(null);
    }
  }

  if (!loggedIn) return null;

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={toggle}
        aria-label={count > 0 ? `اعلان‌ها، ${count} خوانده‌نشده` : 'اعلان‌ها'}
        style={{
          position: 'relative', width: 36, height: 36, borderRadius: 11,
          background: C.surface2, border: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted,
        }}
      >
        <BellIcon size={17} />
        {count > 0 && (
          <span style={{
            position: 'absolute', top: -3, right: -3, minWidth: 16, height: 16, borderRadius: 8,
            background: C.statusExpired, color: C.onAccent, fontSize: 9, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px',
            border: `2px solid ${C.bg}`,
          }}>
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {/* ── the card that slides in the moment something arrives ── */}
      {toast && (() => {
        const meta = metaFor(toast.category);
        const Icon = meta.icon;
        return (
          <div
            role="alert"
            onClick={() => go(toast)}
            style={{
              position: 'fixed', zIndex: 70, cursor: toast.url ? 'pointer' : 'default',
              insetInlineStart: 12, insetInlineEnd: 12, top: 'calc(66px + env(safe-area-inset-top))',
              maxWidth: 480, marginInline: 'auto',
              display: 'flex', alignItems: 'flex-start', gap: 11,
              background: C.surfaceSolid,
              backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
              border: `1px solid ${alpha(meta.color, 34)}`,
              borderRadius: 18, boxShadow: C.shadowPopover, padding: '13px 14px',
              animation: 'fadeInDown 0.24s cubic-bezier(.34,1.2,.64,1) both',
            }}
          >
            <IconBadge color={meta.color} size={36} radius={12}><Icon size={16} /></IconBadge>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: C.text }}>{toast.title}</p>
              <p style={{ margin: '4px 0 0', fontSize: 11.5, color: C.muted, lineHeight: 1.7 }}>{toast.body}</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setToast(null); }}
              aria-label="بستن"
              style={{ background: 'transparent', border: 'none', color: C.subtle, padding: 2, flexShrink: 0 }}
            >
              <XIcon size={15} />
            </button>
          </div>
        );
      })()}

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 55 }} />
          <div
            style={{
              position: 'absolute', top: 'calc(100% + 10px)', left: 0, zIndex: 56,
              width: 'min(360px, 88vw)', maxHeight: '70vh', overflowY: 'auto',
              background: C.surfaceSolid,
              backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
              border: `1px solid ${C.borderStrong}`,
              borderRadius: 20,
              boxShadow: C.shadowPopover,
              animation: 'fadeInDown 0.22s cubic-bezier(.34,1.2,.64,1) both',
              padding: '14px 14px 14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <BellIcon size={15} color={C.green} />
              <h2 style={{ fontWeight: 900, color: C.text, fontSize: 14, margin: 0 }}>اعلان‌ها</h2>
            </div>

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '30px 0' }}><Spinner /></div>
            ) : items.length === 0 ? (
              <EmptyState icon={<BellIcon size={24} />} title="اعلانی نداری" sub="هر خبری بیاد اینجا نشونت می‌دیم" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {items.map(n => {
                  const meta = metaFor(n.category);
                  const Icon = meta.icon;
                  const actionable = n.status === 'pending' && n.type === 'mechanic_link_request';
                  const clickable = !!n.url && !actionable;

                  return (
                    <div
                      key={n.id}
                      onClick={clickable ? () => go(n) : undefined}
                      role={clickable ? 'link' : undefined}
                      tabIndex={clickable ? 0 : undefined}
                      onKeyDown={clickable ? (e) => { if (e.key === 'Enter') go(n); } : undefined}
                      style={{
                        background: n.read ? C.fill1 : alpha(meta.color, 7),
                        border: `1px solid ${n.read ? C.border : alpha(meta.color, 30)}`,
                        borderRadius: 16, padding: '12px 13px',
                        cursor: clickable ? 'pointer' : 'default',
                        display: 'flex', gap: 11, alignItems: 'flex-start',
                      }}
                    >
                      <IconBadge color={meta.color} size={34} radius={11}><Icon size={15} /></IconBadge>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                          <p style={{ fontSize: 13, fontWeight: 800, color: C.text, margin: 0 }}>{n.title}</p>
                          {!n.read && (
                            <span
                              aria-label="خوانده‌نشده"
                              style={{ width: 7, height: 7, borderRadius: '50%', background: meta.color, flexShrink: 0, marginTop: 5 }}
                            />
                          )}
                        </div>
                        <p style={{ fontSize: 12, color: C.muted, margin: '5px 0 0', lineHeight: 1.7 }}>{n.body}</p>
                        <p style={{ fontSize: 10, color: C.subtle, margin: '5px 0 0' }}>{relativeTime(n.createdAt)}</p>

                        {actionable && (
                          <div style={{ display: 'flex', gap: 8, marginTop: 11 }}>
                            <Button
                              size="sm" fullWidth icon={<CheckIcon size={13} />}
                              loading={actingId === n.id}
                              onClick={() => act(n, 'confirm')}
                            >
                              تایید می‌کنم
                            </Button>
                            <Button
                              size="sm" fullWidth variant="danger" icon={<XIcon size={13} />}
                              disabled={actingId === n.id}
                              onClick={() => act(n, 'reject')}
                            >
                              درست نیست
                            </Button>
                          </div>
                        )}

                        {!actionable && n.status !== 'confirmed' && (
                          <p style={{
                            fontSize: 10.5, fontWeight: 700, margin: '8px 0 0',
                            color: n.status === 'rejected' ? C.statusExpired : C.subtle,
                          }}>
                            {n.status === 'rejected' ? 'رد شد' : ''}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              style={{
                display: 'block', textAlign: 'center', textDecoration: 'none',
                marginTop: 12, padding: '10px', borderRadius: 13,
                background: alpha(C.green, 10), color: C.green,
                border: `1px solid ${alpha(C.green, 22)}`,
                fontSize: 12.5, fontWeight: 800,
              }}
            >
              همهٔ اعلان‌ها
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
