import type { ComponentType } from 'react';
import {
  DropletIcon, CircleIcon, DiscIcon, FilterIcon, ZapIcon, SettingsIcon, LinkIcon,
  BatteryIcon, WrenchIcon, SnowflakeIcon, PaintbrushIcon, GaugeIcon, FileTextIcon,
  CompassIcon, NavigationIcon, SparklesIcon, RoadIcon, ShieldIcon, CarFrontIcon,
} from './icons';
import { C, SVC_COLOR } from './ui/tokens';

export type IconComp = ComponentType<{ size?: number }>;

export const SERVICE_META: Record<string, { color: string; icon: IconComp }> = {
  'تعویض روغن موتور': { color: SVC_COLOR.oil,        icon: DropletIcon },
  'تعویض لاستیک':     { color: SVC_COLOR.tire,       icon: CircleIcon },
  'تعمیر ترمز':       { color: SVC_COLOR.brake,      icon: DiscIcon },
  'تعویض فیلتر هوا':  { color: SVC_COLOR.filter,     icon: FilterIcon },
  'تعویض شمع':        { color: SVC_COLOR.plug,       icon: ZapIcon },
  'سرویس گیربکس':     { color: SVC_COLOR.gearbox,    icon: SettingsIcon },
  'تعویض تایمینگ':    { color: SVC_COLOR.timing,     icon: LinkIcon },
  'تعویض باتری':      { color: SVC_COLOR.battery,    icon: BatteryIcon },
  'تنظیم موتور':      { color: SVC_COLOR.tuning,     icon: WrenchIcon },
  'سرویس کولر':       { color: SVC_COLOR.ac,         icon: SnowflakeIcon },
  'صافکاری و رنگ':    { color: SVC_COLOR.paint,      icon: PaintbrushIcon },
  'سرویس جلوبندی':    { color: SVC_COLOR.suspension, icon: GaugeIcon },
  'سایر':             { color: SVC_COLOR.other,      icon: FileTextIcon },
};

/**
 * Eight of the twenty catalogue services are typed «سایر» — diagnostics, wheel
 * balancing, car wash, roadside assistance, ceramic coating, clutch, radiator
 * flush, ATF change. Keying artwork off `serviceType` alone drew all eight as
 * the same grey document card, so 40% of the grid was visually identical and
 * unscannable. These read the service's own name instead. Hues are reused from
 * the existing palette rather than invented, so both themes stay correct; the
 * icon is what separates two services that share one.
 */
const NAME_META: Array<[RegExp, { color: string; icon: IconComp }]> = [
  [/رادیاتور|خنک/,                { color: SVC_COLOR.ac,      icon: DropletIcon }],
  [/دیاگ|عیب.?یاب/,               { color: SVC_COLOR.ac,      icon: CompassIcon }],
  [/بالانس|تنظیم فرمان/,          { color: SVC_COLOR.tire,    icon: NavigationIcon }],
  [/روغن گیربکس|گیربکس اتوماتیک/, { color: SVC_COLOR.gearbox, icon: DropletIcon }],
  [/واش|شویی|پولیش/,              { color: SVC_COLOR.tuning,  icon: SparklesIcon }],
  [/امداد|باتری به باتری/,        { color: SVC_COLOR.battery, icon: RoadIcon }],
  [/سرامیک|نانو/,                 { color: SVC_COLOR.paint,   icon: ShieldIcon }],
  [/کلاچ|دیسک و صفحه/,            { color: SVC_COLOR.plug,    icon: DiscIcon }],
  [/قبل از سفر|چک سفر/,           { color: SVC_COLOR.filter,  icon: CarFrontIcon }],
];

export function svcMeta(type: string, name?: string) {
  const exact = SERVICE_META[type];
  if (exact && type !== 'سایر') return exact;
  if (name) {
    for (const [re, m] of NAME_META) if (re.test(name)) return m;
  }
  return exact ?? { color: C.green, icon: WrenchIcon };
}
