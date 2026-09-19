'use client';
import { useEffect, useState } from 'react';
import { C, alpha } from './ui';
import { XIcon, DownloadIcon } from './icons';

const DISMISSED = 'v-install-dismissed';
const SNOOZE_DAYS = 14;

type Choice = { outcome: 'accepted' | 'dismissed' };
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<Choice> };

function standalone() {
  if (typeof window === 'undefined') return true;
  return window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as unknown as { standalone?: boolean }).standalone === true;
}

function snoozed() {
  try {
    const at = Number(localStorage.getItem(DISMISSED) || 0);
    return at > 0 && Date.now() - at < SNOOZE_DAYS * 864e5;
  } catch { return false; }
}

/**
 * The install invitation.
 *
 * Chrome and Edge hand us a real prompt through `beforeinstallprompt`, so the
 * button installs in one tap. iOS fires no such event and has no API for it —
 * there the only honest thing is to show where the button is, because telling
 * someone to "tap install" on a platform with no install button is worse than
 * saying nothing. Either way it appears once, is dismissible, and stays gone
 * for two weeks.
 */
export default function InstallPrompt() {
  const [evt, setEvt] = useState<InstallEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [open, setOpen] = useState(false);
  const [lift, setLift] = useState(14);

  useEffect(() => {
    if (standalone() || snoozed()) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();               // keep Chrome's own mini-bar away
      setEvt(e as InstallEvent);
      setOpen(true);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);

    // iOS Safari: no event will ever come, so decide from the platform.
    const ua = navigator.userAgent;
    const isIos = /iphone|ipad|ipod/i.test(ua);
    const isSafari = /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
    if (isIos && isSafari) { setIos(true); setOpen(true); }

    // Sit above the tab bar where there is one, at the edge where there is not.
    const bar = document.querySelector('.tabbar');
    setLift(bar ? 86 : 14);

    const onInstalled = () => setOpen(false);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  function close() {
    setOpen(false);
    try { localStorage.setItem(DISMISSED, String(Date.now())); } catch { /* private mode */ }
  }

  async function install() {
    if (!evt) return;
    await evt.prompt();
    const { outcome } = await evt.userChoice;
    if (outcome === 'accepted') setOpen(false); else close();
  }

  if (!open) return null;

  return (
    <div className="ip" style={{ bottom: `calc(${lift}px + env(safe-area-inset-bottom))` }} role="dialog" aria-label="نصب برنامه">
      <div className="ip-card" style={{ background: C.surfaceSolid, boxShadow: C.shadowHero, border: `1px solid ${C.border}` }}>
        <img src="/icon-192.png" alt="" width={44} height={44} className="ip-icon" />
        <div className="ip-copy">
          <b style={{ color: C.textStrong }}>دستیار خودرو را روی گوشی‌ات نصب کن</b>
          {ios ? (
            <p style={{ color: C.text2 }}>
              دکمه‌ی هم‌رسانی
              <span className="ip-key" style={{ background: C.fill2, color: C.text }} aria-label="هم‌رسانی">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 15V3M8 7l4-4 4 4" />
                  <path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
                </svg>
              </span>
              را بزن و «Add to Home Screen» را انتخاب کن.
            </p>
          ) : (
            <p style={{ color: C.text2 }}>بدون فروشگاه، در چند ثانیه. سریع‌تر باز می‌شود و دیگر لازم نیست هر بار وارد شوی.</p>
          )}
        </div>
        {!ios && (
          <button type="button" onClick={install} className="ip-go"
            style={{ background: `linear-gradient(135deg, ${C.green}, ${C.greenDark})`, color: C.onAccent, boxShadow: C.shadowBrand }}>
            <DownloadIcon size={15} />نصب
          </button>
        )}
        <button type="button" onClick={close} className="ip-x" aria-label="بستن" style={{ color: C.muted, background: C.fill2 }}>
          <XIcon size={14} />
        </button>
      </div>

      <style jsx>{`
        .ip{position:fixed;left:12px;right:12px;z-index:45;display:flex;justify-content:center;pointer-events:none;
            animation:ipIn .42s cubic-bezier(.32,.72,0,1) backwards}
        @keyframes ipIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
        .ip-card{pointer-events:auto;width:100%;max-width:520px;border-radius:20px;padding:12px 13px;
                 display:flex;align-items:center;gap:11px}
        .ip-icon{border-radius:12px;flex-shrink:0}
        .ip-copy{flex:1;min-width:0}
        .ip-copy b{display:block;font-size:13.5px;font-weight:900;line-height:1.5}
        .ip-copy p{margin:3px 0 0;font-size:11.5px;line-height:1.8}
        .ip-key{display:inline-grid;place-items:center;min-width:18px;height:18px;border-radius:5px;padding:0 4px;
                font-size:11px;vertical-align:middle}
        .ip-go{flex-shrink:0;border:0;cursor:pointer;border-radius:13px;padding:11px 14px;font:900 12.5px var(--font-sans);
               display:inline-flex;align-items:center;gap:6px;
               transition:transform var(--dur-press,120ms) var(--ease-soft,ease)}
        .ip-go:active{transform:scale(.96)}
        .ip-x{flex-shrink:0;border:0;cursor:pointer;width:28px;height:28px;border-radius:50%;display:grid;place-items:center}
        @media (max-width:400px){
          .ip-card{flex-wrap:wrap}
          .ip-copy{flex:1 1 100%;order:2}
          .ip-go{order:3;flex:1}
        }
        @media (prefers-reduced-motion: reduce){ .ip{animation:none} .ip-go:active{transform:none} }
      `}</style>
    </div>
  );
}
