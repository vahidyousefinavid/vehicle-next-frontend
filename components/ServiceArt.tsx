'use client';
import { alpha, C } from './ui';
import { svcMeta } from './serviceMeta';

/**
 * The picture on a service card.
 *
 * This used to imitate a product photograph — a three-stop wash, two blurred
 * orbs, concentric rings and a diagonal sheen — because the template the design
 * followed puts a photo at the top of every card and there is no photo library
 * for car services. The imitation cost more than it bought: it filled the space
 * where the price and availability should be with decoration, and at the twelve
 * sizes it is used at the orbs just read as haze.
 *
 * It is flat now, and the hue does one job: identify the service. A plate of
 * the service's colour, a rule of the full colour along the top edge to key the
 * card, and one large icon. The rule is what makes a grid of these scannable —
 * thirteen hues read as thirteen labels when they are solid, and as mud when
 * they are washes.
 */
export default function ServiceArt({
  serviceType, name, height = 108, radius = 20, iconSize = 42, bleed = false, plate = false,
}: {
  serviceType: string;
  /** The catalogue's own label — services typed «سایر» get their artwork from it. */
  name?: string;
  height?: number | string;
  radius?: number;
  iconSize?: number;
  /** Sit on the floor of a card and be clipped by its corners rather than
   *  floating inside it. */
  bleed?: boolean;
  /** Carry the icon on a raised plate. Cards use it; the wide banner on the
   *  order screen reads better with the icon straight on the tint. */
  plate?: boolean;
}) {
  const meta = svcMeta(serviceType, name);
  const Icon = meta.icon;
  const plateSize = Math.round(iconSize * 1.62);

  /* The keying rule. Thin enough to stay a rule rather than a band, and only
     drawn on the top edge so a column of cards lines its colours up. */
  const ruleHeight = typeof height === 'number' && height < 70 ? 2 : 3;

  return (
    <span
      aria-hidden="true"
      style={{
        position: 'relative',
        display: 'block',
        width: '100%',
        height,
        borderRadius: bleed ? 0 : radius,
        overflow: 'hidden',
        background: alpha(meta.color, 11),
      }}
    >
      <span style={{
        position: 'absolute', insetInline: 0, top: 0, height: ruleHeight,
        background: meta.color,
      }} />

      <span className="svc-art-fig" style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
        {plate ? (
          <span style={{
            width: plateSize, height: plateSize, borderRadius: Math.round(plateSize * 0.3),
            display: 'grid', placeItems: 'center',
            background: C.surfaceSolid, color: meta.color,
            boxShadow: `inset 0 0 0 1px ${alpha(meta.color, 22)}`,
          }}>
            <Icon size={iconSize} />
          </span>
        ) : (
          <span style={{ color: meta.color }}><Icon size={iconSize} /></span>
        )}
      </span>
    </span>
  );
}
