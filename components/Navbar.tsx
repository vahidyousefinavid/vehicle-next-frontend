'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CarIcon, ChevronRightIcon } from './icons';
import { C } from './ui';
import NotificationsBell from './NotificationsBell';
import MessagesBell from './MessagesBell';
import ThemeToggle from './ThemeToggle';
import { homeHref } from '@/lib/session';

/**
 * The bar at the top of every inner screen.
 *
 * It used to wrap the page's own title in a link to the home screen, so on
 * «پروفایل» you tapped the word «پروفایل» and were thrown back to the
 * dashboard. The mark goes home; the title is a title. Where a screen is not
 * the top of its section it also gets a back control, because "how do I get
 * out of here" should never be answered by the browser's chrome alone.
 */
export default function Navbar({ title, back }: { title?: string; back?: boolean | string }) {
  const router = useRouter();
  const [home, setHome] = useState('/dashboard');
  /* resolved after mount: the role lives in localStorage, which the server
     render can't see */
  useEffect(() => setHome(homeHref()), []);

  return (
    <header className="nb">
      <div className="nb-in">
        {back && (
          typeof back === 'string'
            ? <Link href={back} className="nb-back" aria-label="بازگشت" style={{ background: C.fill2, color: C.text2 }}><ChevronRightIcon size={17} /></Link>
            : <button type="button" onClick={() => router.back()} className="nb-back" aria-label="بازگشت" style={{ background: C.fill2, color: C.text2 }}><ChevronRightIcon size={17} /></button>
        )}

        <Link href={home} className="nb-mark" aria-label="خانه">
          <span style={{
            background: `linear-gradient(135deg, ${C.green}, ${C.greenDark})`,
            color: C.onAccent,
            boxShadow: `0 4px 14px ${C.greenGlow}`,
          }}>
            <CarIcon size={18} />
          </span>
        </Link>

        <h1 className="nb-title" style={{ color: C.textStrong }}>{title ?? 'دستیار خودرو'}</h1>

        <div className="nb-actions">
          <ThemeToggle />
          <MessagesBell />
          <NotificationsBell />
        </div>
      </div>

      <style jsx>{`
        .nb{
          position:sticky;top:0;z-index:40;
          background:var(--nav-bg);
          backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);
          border-bottom:1px solid var(--border);
          box-shadow:var(--shadow-nav);
          padding-top:env(safe-area-inset-top);
        }
        .nb-in{
          max-width:620px;margin:0 auto;padding:0 14px;height:58px;
          display:flex;align-items:center;gap:10px;
        }
        :global(.nb-back){
          width:36px;height:36px;border:0;flex-shrink:0;border-radius:12px;cursor:pointer;
          display:grid;place-items:center;text-decoration:none;
          transition:transform var(--dur-press,120ms) var(--ease-soft,ease),background var(--dur-move,260ms) var(--ease-soft,ease);
        }
        :global(.nb-back:active){transform:scale(.92)}
        :global(.nb-mark){flex-shrink:0;display:flex;text-decoration:none;
                 transition:transform var(--dur-press,120ms) var(--ease-soft,ease)}
        :global(.nb-mark:active){transform:scale(.92)}
        :global(.nb-mark) span{width:34px;height:34px;border-radius:11px;display:grid;place-items:center}
        .nb-title{
          flex:1;min-width:0;margin:0;
          font-size:15px;font-weight:900;line-height:1.3;
          overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
        }
        .nb-actions{display:flex;align-items:center;gap:6px;flex-shrink:0}
        @media (prefers-reduced-motion: reduce){ :global(.nb-back:active),:global(.nb-mark:active){transform:none} }
      `}</style>
    </header>
  );
}
