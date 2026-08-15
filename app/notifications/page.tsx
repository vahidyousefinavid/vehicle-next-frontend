'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import { api, AppNotification, NotificationCategory } from '@/lib/api';
import { getToken } from '@/lib/session';
import { relativeTime, jalaliDateTime } from '@/lib/when';
import { C, alpha, Card, Button, EmptyState, Spinner, Sheet, IconBadge } from '@/components/ui';
import { CATEGORY_META, metaFor, destinationLabel } from '@/components/notificationMeta';
import { ChevronRightIcon, BellIcon, CheckIcon, XIcon } from '@/components/icons';

/**
 * اعلان‌ها — the whole inbox, not the last few.
 *
 * The bell is a glance: it holds the newest handful and clears its badge when
 * opened. That is the wrong tool for «برای آن نوبت هفتهٔ پیش چه شد؟», which
 * needs a list you can filter and page through, and an item you can open and
 * read in full. Every item leads somewhere — a notification you cannot follow
 * to its subject is only a sentence.
 */

const PAGE_SIZE = 20;
/** Persian digits, so a count never sits next to «۲ دقیقه پیش» in Latin ones. */
const fa = (n: number) => n.toLocaleString('fa-IR');

const ORDER: NotificationCategory[] = ['link', 'appointment', 'invoice', 'tracker', 'message', 'reminder', 'other'];

export default function NotificationsPage() {
  const router = useRouter();

  const [items, setItems] = useState<AppNotification[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [unread, setUnread] = useState(0);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);

  const [category, setCategory] = useState<NotificationCategory | 'all'>('all');
  const [unreadOnly, setUnreadOnly] = useState(false);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [open, setOpen] = useState<AppNotification | null>(null);

  const load = useCallback((nextPage: number, replace: boolean) => {
    setBusy(true);
    api.notifications.inbox({ page: nextPage, pageSize: PAGE_SIZE, category, unreadOnly })
      .then(res => {
        setItems(current => (replace ? res.items : [...current, ...res.items]));
        setCounts(res.counts);
        setUnread(res.unread);
        setTotal(res.total);
        setPage(nextPage);
      })
      .catch(() => {})
      .finally(() => { setBusy(false); setLoading(false); });
  }, [category, unreadOnly]);

  useEffect(() => {
    if (!getToken()) { router.replace('/'); return; }
    load(0, true);
  }, [router, load]);

  /* ── live, on the page too ────────────────────────────────────────────────
     Someone sitting on the inbox is the most likely person to be waiting for
     something. An arrival is prepended rather than triggering a reload, so it
     does not throw away the pages they have already scrolled through — but
     only when it would belong under the filter they are looking at, because
     silently inserting a row that contradicts the active filter is worse than
     not showing it. */
  const filterRef = useRef({ category, unreadOnly });
  filterRef.current = { category, unreadOnly };

  useEffect(() => {
    if (!getToken() || typeof window === 'undefined' || !('EventSource' in window)) return;

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
          const { category: active } = filterRef.current;

          setUnread(n => n + 1);
          setCounts(c => ({
            ...c,
            all: (c.all ?? 0) + 1,
            [note.category]: (c[note.category] ?? 0) + 1,
          }));

          if (active !== 'all' && active !== note.category) return;
          setItems(prev => [note, ...prev.filter(p => p.id !== note.id)]);
          setTotal(t => t + 1);
        } catch {
          // A malformed frame is not a reason to drop the stream.
        }
      });

      source.addEventListener('error', () => {
        source?.close();
        if (stopped) return;
        attempt += 1;
        retry = setTimeout(connect, Math.min(30_000, 2_000 * attempt));
      });
    };

    connect();
    return () => {
      stopped = true;
      if (retry) clearTimeout(retry);
      source?.close();
    };
  }, []);

  /** Opening one reads it — a badge should not survive having been looked at. */
  function openNote(note: AppNotification) {
    setOpen(note);
    if (note.read) return;

    api.notifications.read(note.id).then(r => setUnread(r.unread)).catch(() => {});
    setItems(current => current.map(n => (n.id === note.id ? { ...n, read: true } : n)));
    setOpen({ ...note, read: true });
  }

  function readAll() {
    setBusy(true);
    api.notifications.read()
      .then(() => load(0, true))
      .catch(() => setBusy(false));
  }

  function go(note: AppNotification) {
    setOpen(null);
    if (note.url) router.push(note.url);
  }

  async function act(note: AppNotification, kind: 'confirm' | 'reject') {
    setActingId(note.id);
    try {
      const updated = kind === 'confirm' ? await api.notifications.confirm(note.id) : await api.notifications.reject(note.id);
      setItems(prev => prev.map(n => (n.id === note.id ? updated : n)));
      setOpen(o => (o && o.id === note.id ? updated : o));
      const r = await api.notifications.inbox({ page: 0, pageSize: 1, category, unreadOnly });
      setUnread(r.unread);
    } finally {
      setActingId(null);
    }
  }

  /* Only categories that actually have something. A chip for a kind of event
     this account has never received is a filter that can only ever be empty. */
  const chips: Array<{ value: NotificationCategory | 'all'; label: string; color: string }> = [
    { value: 'all', label: `همه (${fa(counts.all ?? 0)})`, color: C.green },
    ...ORDER.filter(c => counts[c]).map(c => ({
      value: c,
      label: `${CATEGORY_META[c].label} (${fa(counts[c])})`,
      color: CATEGORY_META[c].color,
    })),
  ];

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar title="اعلان‌ها" />
      <main style={{ maxWidth: 560, margin: '0 auto', padding: '0 14px calc(88px + env(safe-area-inset-bottom))' }}>
        <button
          onClick={() => router.back()}
          style={{ background: 'none', border: 'none', color: C.muted, fontSize: 13, fontWeight: 600, padding: '14px 0 10px', display: 'flex', alignItems: 'center', gap: 5 }}
        >
          <ChevronRightIcon size={16} /> بازگشت
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 13 }}>
          <p style={{ fontSize: 12, color: C.muted, margin: 0, lineHeight: 1.7 }}>
            {unread > 0 ? `${fa(unread)} اعلان خوانده‌نشده داری` : 'هر چیزی که درباره خودروها، نوبت‌ها و صورتحساب‌هات پیش بیاد'}
          </p>
          {unread > 0 && (
            <Button size="sm" variant="ghost" onClick={readAll} disabled={busy} icon={<CheckIcon size={13} />}>
              خواندن همه
            </Button>
          )}
        </div>

        {/* filter by subject */}
        {chips.length > 1 && (
          <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 4, marginBottom: 10 }}>
            {chips.map(chip => {
              const on = chip.value === category;
              return (
                <button
                  key={chip.value}
                  onClick={() => setCategory(chip.value)}
                  style={{
                    flexShrink: 0, padding: '7px 13px', borderRadius: 999,
                    fontSize: 11.5, fontWeight: 800, whiteSpace: 'nowrap',
                    background: on ? chip.color : alpha(chip.color, 10),
                    color: on ? C.onAccent : chip.color,
                    border: `1px solid ${on ? chip.color : alpha(chip.color, 24)}`,
                  }}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        )}

        <button
          onClick={() => setUnreadOnly(v => !v)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 14,
            padding: '7px 13px', borderRadius: 999, fontSize: 11.5, fontWeight: 800,
            background: unreadOnly ? alpha(C.blue, 14) : C.surface2,
            color: unreadOnly ? C.blue : C.muted,
            border: `1px solid ${unreadOnly ? alpha(C.blue, 30) : C.border}`,
          }}
        >
          فقط خوانده‌نشده‌ها
        </button>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}><Spinner /></div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<BellIcon size={26} />}
            title={unreadOnly || category !== 'all' ? 'با این فیلتر چیزی نیست' : 'هنوز اعلانی نداری'}
            sub={
              unreadOnly || category !== 'all'
                ? 'فیلتر رو عوض کن تا بقیه اعلان‌ها رو ببینی'
                : 'هر وقت نوبتی ثبت بشه، صورتحسابی بیاد یا ردیاب خبری بده، همین‌جا بهت می‌گیم'
            }
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.map(note => {
              const meta = metaFor(note.category);
              const Icon = meta.icon;
              return (
                <Card key={note.id} padding="12px 14px" onClick={() => openNote(note)}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
                    <IconBadge color={meta.color} size={36} radius={12}><Icon size={16} /></IconBadge>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <p style={{
                          margin: 0, flex: 1, minWidth: 0, fontSize: 13, color: C.text,
                          fontWeight: note.read ? 700 : 800,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {note.title}
                        </p>
                        {!note.read && (
                          <span
                            aria-label="خوانده‌نشده"
                            style={{ width: 7, height: 7, borderRadius: '50%', background: meta.color, flexShrink: 0, marginTop: 5 }}
                          />
                        )}
                      </div>

                      <p style={{
                        margin: '4px 0 0', fontSize: 11.5, color: C.muted, lineHeight: 1.75,
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }}>
                        {note.body}
                      </p>

                      <p style={{ margin: '5px 0 0', fontSize: 10, color: C.subtle }}>
                        {meta.label} · {relativeTime(note.createdAt)}
                        {note.status === 'pending' && ' · در انتظار پاسخ تو'}
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}

            {items.length < total && (
              <Button variant="ghost" fullWidth onClick={() => load(page + 1, false)} loading={busy}>
                اعلان‌های بیشتر
              </Button>
            )}
          </div>
        )}
      </main>

      {/* ── one notification, read in full ── */}
      {open && (() => {
        const meta = metaFor(open.category);
        const Icon = meta.icon;
        const actionable = open.status === 'pending' && open.type === 'mechanic_link_request';

        return (
          <Sheet title={open.title} icon={<Icon size={17} />} onClose={() => setOpen(null)}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p style={{ margin: 0, fontSize: 11, color: C.subtle }}>
                {meta.label} · {jalaliDateTime(open.createdAt)}
              </p>

              <p style={{
                margin: 0, padding: '14px 15px', borderRadius: 14,
                background: C.surface2, border: `1px solid ${C.border}`,
                fontSize: 13, color: C.text, lineHeight: 2,
              }}>
                {open.body || 'توضیح بیشتری ثبت نشده.'}
              </p>

              {actionable ? (
                <div style={{ display: 'flex', gap: 9 }}>
                  <Button
                    fullWidth icon={<CheckIcon size={14} />}
                    loading={actingId === open.id}
                    onClick={() => act(open, 'confirm')}
                  >
                    تایید می‌کنم
                  </Button>
                  <Button
                    fullWidth variant="danger" icon={<XIcon size={14} />}
                    disabled={actingId === open.id}
                    onClick={() => act(open, 'reject')}
                  >
                    درست نیست
                  </Button>
                </div>
              ) : open.url ? (
                <Button fullWidth size="lg" onClick={() => go(open)}>
                  {destinationLabel(open.url)}
                </Button>
              ) : (
                <p style={{ margin: 0, fontSize: 11.5, color: C.subtle, textAlign: 'center' }}>
                  {open.status === 'confirmed' ? 'این مورد تایید شده.' : open.status === 'rejected' ? 'این مورد رد شده.' : ''}
                </p>
              )}
            </div>
          </Sheet>
        );
      })()}

      <BottomNav />
    </div>
  );
}
