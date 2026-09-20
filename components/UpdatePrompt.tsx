'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { C, alpha } from './ui';
import { DownloadIcon, XIcon } from './icons';

/**
 * "A new version is ready."
 *
 * An installed app has no store badge and no reload button, so without this a
 * person stays on whatever build they installed until they happen to clear
 * their cache. The worker deliberately does not activate on its own (see
 * public/sw.js) — it waits, this notices it waiting, and the swap happens when
 * the person says so. That ordering is what stops a running page from having
 * its JS chunks replaced underneath it mid-session.
 */
export default function UpdatePrompt() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [busy, setBusy] = useState(false);
  const reloading = useRef(false);

  const offer = useCallback((sw: ServiceWorker | null) => {
    // Only an update *over an existing app* is worth interrupting for. On a
    // first visit there is no controller, and the very first worker reaching
    // `installed` is an install, not an update.
    if (sw && navigator.serviceWorker.controller) setWaiting(sw);
  }, []);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    let reg: ServiceWorkerRegistration | undefined;

    const onControllerChange = () => {
      if (reloading.current) return;
      reloading.current = true;       // guard: controllerchange can fire twice
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    navigator.serviceWorker.ready.then((r) => {
      reg = r;
      offer(r.waiting);

      r.addEventListener('updatefound', () => {
        const next = r.installing;
        if (!next) return;
        next.addEventListener('statechange', () => {
          if (next.state === 'installed') offer(r.waiting ?? next);
        });
      });
    }).catch(() => {});

    /* Check on return to the app and hourly while it is open. A PWA that is
       never closed would otherwise never ask the server whether it is stale. */
    const check = () => { if (document.visibilityState === 'visible') reg?.update().catch(() => {}); };
    document.addEventListener('visibilitychange', check);
    const timer = window.setInterval(check, 60 * 60 * 1000);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      document.removeEventListener('visibilitychange', check);
      window.clearInterval(timer);
    };
  }, [offer]);

  if (!waiting) return null;

  function apply() {
    setBusy(true);
    waiting?.postMessage({ type: 'SKIP_WAITING' });
    // controllerchange reloads; this is only a floor if the worker never swaps
    window.setTimeout(() => { if (!reloading.current) window.location.reload(); }, 3000);
  }

  return (
    <div className="upd" role="status">
      <span className="upd-ico" style={{ background: alpha(C.green, 14), color: C.green }}>
        <DownloadIcon size={17} />
      </span>
      <div className="upd-copy">
        <b style={{ color: C.textStrong }}>نسخهٔ تازه آماده است</b>
        <p style={{ color: C.text2 }}>برای استفاده از آخرین تغییرات، برنامه را دوباره بارگذاری کن.</p>
      </div>
      <button
        type="button"
        onClick={apply}
        disabled={busy}
        className="upd-go"
        style={{ background: C.green, color: C.onAccent, boxShadow: C.shadowBrand }}
      >
        {busy ? 'در حال بارگذاری…' : 'بارگذاری'}
      </button>
      <button
        type="button"
        onClick={() => setWaiting(null)}
        className="upd-x tap44"
        aria-label="بعداً"
        style={{ color: C.muted, background: C.fill2 }}
      >
        <XIcon size={14} />
      </button>

      <style jsx>{`
        .upd{
          position:fixed; z-index:9998;
          inset-inline:12px; top:calc(12px + env(safe-area-inset-top));
          display:flex; align-items:center; gap:10px;
          max-width:520px; margin-inline:auto;
          padding:11px 12px; border-radius:18px;
          background:var(--surface-solid);
          border:1px solid var(--border);
          box-shadow:var(--shadow-hero);
          animation:updIn .32s var(--ease-spring,cubic-bezier(.22,1.2,.36,1)) backwards;
        }
        @keyframes updIn{ from{opacity:0;transform:translateY(-14px)} to{opacity:1;transform:none} }
        .upd-ico{width:36px;height:36px;border-radius:12px;display:grid;place-items:center;flex-shrink:0}
        .upd-copy{flex:1;min-width:0}
        .upd-copy b{display:block;font-size:13px;font-weight:800;line-height:1.4}
        .upd-copy p{margin:2px 0 0;font-size:11px;line-height:1.5}
        .upd-go{
          flex-shrink:0; min-height:40px; padding:0 14px; border:0; border-radius:12px;
          font-family:var(--font-sans); font-size:12.5px; font-weight:900; cursor:pointer;
          transition:transform var(--dur-press,120ms) var(--ease-soft,ease);
        }
        .upd-go:active{transform:scale(.97)}
        .upd-go:disabled{opacity:.7;cursor:default}
        .upd-x{
          flex-shrink:0; width:28px; height:28px; border:0; border-radius:9px;
          display:grid; place-items:center; cursor:pointer;
        }
        @media (prefers-reduced-motion: reduce){ .upd{animation:none} .upd-go:active{transform:none} }
      `}</style>
    </div>
  );
}
