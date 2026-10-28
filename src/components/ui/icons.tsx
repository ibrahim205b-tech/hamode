import {
  Smartphone, BatteryFull, PlugZap, Camera, Speaker, Cpu, CircuitBoard, Wrench, Droplets, Headphones,
  Tablet, BadgeCheck, Package, type LucideIcon,
} from "lucide-react";

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  screen: Smartphone,
  battery: BatteryFull,
  charging: PlugZap,
  camera: Camera,
  audio: Speaker,
  internal: Cpu,
  board: CircuitBoard,
  tools: Wrench,
  consumables: Droplets,
  accessories: Headphones,
  tablet: Tablet,
  special: BadgeCheck,
};

export const ICON_KEYS = Object.keys(CATEGORY_ICONS);

export function CategoryIcon({ name, className }: { name?: string | null; className?: string }) {
  const Icon = (name && CATEGORY_ICONS[name]) || Package;
  return <Icon className={className} aria-hidden="true" />;
}
