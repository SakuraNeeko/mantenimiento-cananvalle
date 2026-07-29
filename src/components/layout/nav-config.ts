import {
  Activity,
  BarChart3,
  Boxes,
  CalendarClock,
  ClipboardCheck,
  ClipboardList,
  Cog,
  Fuel,
  Gauge,
  History,
  Layers,
  LifeBuoy,
  MessageSquareWarning,
  ShieldAlert,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { PermissionCode } from '@/lib/permissions/catalog';

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** El ítem se muestra solo si el usuario tiene AL MENOS uno de estos permisos. */
  permisos: PermissionCode[];
  /** Módulo opcional: además exige que esté habilitado en `tenant_modules`. */
  modulo?: string;
  /** Fase del roadmap en la que se implementa. Los futuros se marcan como próximos. */
  fase: number;
};

export type NavGroup = {
  titulo: string;
  items: NavItem[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    titulo: 'Operación',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: Gauge, permisos: ['reportes.dashboard.ver'], fase: 1 },
      { href: '/ordenes', label: 'Órdenes de trabajo', icon: Wrench, permisos: ['ordenes.ver'], fase: 6 },
      { href: '/solicitudes', label: 'Solicitudes', icon: MessageSquareWarning, permisos: ['solicitudes.ver'], fase: 5 },
      { href: '/paros', label: 'Paros y averías', icon: ShieldAlert, permisos: ['paros.ver'], fase: 8 },
      { href: '/planes', label: 'Planes', icon: CalendarClock, permisos: ['planes.ver'], fase: 7 },
    ],
  },
  {
    titulo: 'Recursos',
    items: [
      { href: '/activos', label: 'Activos', icon: Activity, permisos: ['activos.ver'], fase: 1 },
      { href: '/almacen/materiales', label: 'Materiales', icon: Boxes, permisos: ['almacen.materiales.ver'], fase: 1 },
      { href: '/almacen/kardex', label: 'Kárdex', icon: Layers, permisos: ['almacen.kardex.ver'], fase: 1 },
      { href: '/almacen/inventario', label: 'Inventario físico', icon: ClipboardCheck, permisos: ['almacen.inventario.ejecutar'], fase: 1 },
      { href: '/infraestructura', label: 'Infraestructura', icon: LifeBuoy, permisos: ['infra.catalogos.ver'], fase: 1 },
    ],
  },
  {
    titulo: 'Análisis',
    items: [
      { href: '/historia', label: 'Historia', icon: History, permisos: ['historia.ver'], fase: 9 },
      { href: '/reportes', label: 'Reportes', icon: BarChart3, permisos: ['reportes.operativos.ver'], fase: 9 },
    ],
  },
  {
    titulo: 'Complementarios',
    items: [
      { href: '/combustibles', label: 'Combustibles', icon: Fuel, permisos: ['combustibles.ver'], modulo: 'combustibles', fase: 10 },
      { href: '/tecnovigilancia', label: 'Tecnovigilancia', icon: ClipboardList, permisos: ['tecnovigilancia.ver'], modulo: 'tecnovigilancia', fase: 10 },
      { href: '/automatizador', label: 'Automatizador', icon: Zap, permisos: ['automatizador.ver'], modulo: 'automatizador', fase: 12 },
    ],
  },
  {
    titulo: 'Sistema',
    items: [
      { href: '/administracion/usuarios', label: 'Usuarios', icon: Cog, permisos: ['admin.usuarios.ver'], fase: 1 },
      { href: '/administracion/roles', label: 'Roles y permisos', icon: Cog, permisos: ['admin.roles.gestionar'], fase: 1 },
      { href: '/administracion/auditoria', label: 'Auditoría', icon: Cog, permisos: ['admin.auditoria.ver'], fase: 1 },
    ],
  },
];

/** Filtra el menú por los permisos del usuario y los módulos activos del tenant. */
export function visibleNav(permisos: string[], modulosActivos: string[]): NavGroup[] {
  const set = new Set(permisos);
  const modulos = new Set(modulosActivos);
  return NAV_GROUPS.map((grupo) => ({
    ...grupo,
    items: grupo.items.filter((item) => {
      if (item.modulo && !modulos.has(item.modulo)) return false;
      return item.permisos.some((p) => set.has(p));
    }),
  })).filter((grupo) => grupo.items.length > 0);
}
