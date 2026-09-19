'use client';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import type { PresetService } from '@/lib/api';
import { svcMeta } from './serviceMeta';
import ServiceArt from './ServiceArt';
import { fa } from './ScreenKit';
import { ChevronLeftIcon, ClockIcon, HomeIcon } from './icons';

/**
 * One service in the catalogue grid.
 *
 * The landing page and the signed-in home had drifted into two different
 * cards showing different things — the home's card carried only a name and a
 * picture, so the price and whether the service travels to you were invisible
 * until you had already tapped through. Both now render this one card.
 *
 * It answers the three questions asked before tapping: what the service is,
 * what it costs, and where it happens. The price is the figure people compare,
 * so it is set in tabular figures and carries the weight while «از» and
 * «تومان» stay quiet around it; the name is clamped to two lines so every
 * footer in the grid sits on the same baseline.
 */
export default function ServiceCard({
  s, index = 0, href, onClick,
}: {
  s: PresetService;
  /** Position in the grid — staggers the entry animation. */
  index?: number;
  /** Cards on the signed-in home navigate; on the landing page they open auth. */
  href?: string;
  onClick?: () => void;
}) {
  const meta = svcMeta(s.serviceType, s.customName);
  const name = s.customName || s.serviceType;
  // در کاتالوگ هست ولی هنوز ارائه نمی‌شود: دیده می‌شود، ولی سفارش نمی‌گیرد.
  const comingSoon = s.availableNow === false;
  // 19 of 20 services are available in a workshop, so a «در تعمیرگاه» chip sat
  // on almost every card and told nobody anything. Only «در محل» is a real
  // differentiator, so only it earns a chip.
  const onSite = s.supportsOnSite;
  const place = comingSoon ? 'به‌زودی' : onSite ? 'در محل' : '';

  const style = {
    '--svc-hue': meta.color,
    '--i': String(Math.min(index, 11)),
  } as CSSProperties;

  const body = (
    <>
      <span className="svc-art-wrap">
        <ServiceArt serviceType={s.serviceType} name={s.customName} height={100} iconSize={34} bleed plate />
        {place && (
          <span className={`svc-chip${comingSoon ? ' is-soon' : ''}`}>
            {comingSoon ? <ClockIcon size={11} /> : <HomeIcon size={11} />}{place}
          </span>
        )}
      </span>
      <span className="svc-body">
        <b className="svc-name">{name}</b>
        <span className="svc-foot">
          <span className="svc-price">
            {s.suggestedPrice
              ? <><i>از</i> {fa(s.suggestedPrice)} <i>تومان</i></>
              : <i>قیمت توافقی</i>}
          </span>
          {!comingSoon && <span className="svc-go" aria-hidden="true"><ChevronLeftIcon size={15} /></span>}
        </span>
      </span>
    </>
  );

  const label = `${name}${s.suggestedPrice ? `، از ${fa(s.suggestedPrice)} تومان` : ''}${
    comingSoon ? '، به‌زودی ارائه می‌شود' : place ? `، ${place}` : ''}`;
  const cls = `svc${comingSoon ? ' is-soon' : ''}`;

  // یک خدمت «به‌زودی» نباید لینک یا دکمه باشد — چیزی که کلیک‌شدنی به نظر
  // برسد و کاری نکند، از همان اول نشان‌ندادنش هم بدتر است.
  if (comingSoon) return <span className={cls} style={style} aria-label={label}>{body}</span>;

  return href ? (
    <Link href={href} className={cls} style={style} aria-label={label}>{body}</Link>
  ) : (
    <button type="button" onClick={onClick} className={cls} style={style} aria-label={label}>{body}</button>
  );
}
