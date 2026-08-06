import type { ComponentType } from 'react';
import {
  DropletIcon, CircleIcon, DiscIcon, FilterIcon, ZapIcon, SettingsIcon, LinkIcon,
  BatteryIcon, WrenchIcon, SnowflakeIcon, PaintbrushIcon, GaugeIcon, FileTextIcon,
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

export function svcMeta(type: string) {
  return SERVICE_META[type] ?? { color: C.green, icon: WrenchIcon };
}
