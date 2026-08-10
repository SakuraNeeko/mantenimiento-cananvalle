import type { PermissionCode } from '@/lib/permissions/catalog';

/**
 * Los íconos se guardan por NOMBRE (string), no como el componente de
 * `lucide-react` en sí: `NAV_GROUPS` se filtra en un Server Component
 * (`(app)/layout.tsx`) y el resultado viaja como prop a `Sidebar`, que es
 * Client. Un componente de React (función) no se puede serializar a través
 * de esa frontera — `sidebar.tsx` resuelve el nombre a un ícono real del
 * lado del cliente, donde sí puede importar `lucide-react` libremente.
 */
export type IconName =
  | 'Gauge'
  | 'Wrench'
  | 'MessageSquareWarning'
  | 'ShieldAlert'
  | 'CalendarClock'
  | 'Activity'
  | 'Boxes'
  | 'Layers'
  | 'ClipboardCheck'
  | 'LifeBuoy'
  | 'History'
  | 'BarChart3'
  | 'Fuel'
  | 'ClipboardList'
  | 'Zap'
  | 'Cog'
  | 'Plug'
  | 'Car';

export type NavItem = {
  href: string;
  label: string;
  icon: IconName;
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
      { href: '/dashboard', label: 'Dashboard', icon: 'Gauge', permisos: ['reportes.dashboard.ver'], fase: 1 },
      { href: '/ordenes', label: 'Órdenes de trabajo', icon: 'Wrench', permisos: ['ordenes.ver'], fase: 1 },
      { href: '/solicitudes', label: 'Solicitudes', icon: 'MessageSquareWarning', permisos: ['solicitudes.ver'], fase: 1 },
      { href: '/paros', label: 'Paros y averías', icon: 'ShieldAlert', permisos: ['paros.ver'], fase: 1 },
      { href: '/planes', label: 'Planes', icon: 'CalendarClock', permisos: ['planes.ver'], fase: 1 },
    ],
  },
  {
    titulo: 'Recursos',
    items: [
      { href: '/activos', label: 'Activos', icon: 'Activity', permisos: ['activos.ver'], fase: 1 },
      { href: '/almacen/materiales', label: 'Materiales', icon: 'Boxes', permisos: ['almacen.materiales.ver'], fase: 1 },
      { href: '/almacen/kardex', label: 'Kárdex', icon: 'Layers', permisos: ['almacen.kardex.ver'], fase: 1 },
      { href: '/almacen/inventario', label: 'Inventario físico', icon: 'ClipboardCheck', permisos: ['almacen.inventario.ejecutar'], fase: 1 },
      { href: '/infraestructura', label: 'Infraestructura', icon: 'LifeBuoy', permisos: ['infra.catalogos.ver'], fase: 1 },
    ],
  },
  {
    titulo: 'Análisis',
    items: [
      { href: '/historia', label: 'Historia', icon: 'History', permisos: ['historia.ver'], fase: 1 },
      { href: '/reportes', label: 'Reportes', icon: 'BarChart3', permisos: ['reportes.operativos.ver'], fase: 1 },
    ],
  },
  {
    titulo: 'Complementarios',
    items: [
      { href: '/combustibles', label: 'Combustibles', icon: 'Fuel', permisos: ['combustibles.ver'], modulo: 'combustibles', fase: 1 },
      { href: '/bitacora-uso', label: 'Bitácora de uso', icon: 'Car', permisos: ['bitacora.ver'], modulo: 'bitacora', fase: 1 },
      { href: '/tecnovigilancia', label: 'Tecnovigilancia', icon: 'ClipboardList', permisos: ['tecnovigilancia.ver'], modulo: 'tecnovigilancia', fase: 1 },
      { href: '/automatizador', label: 'Automatizador', icon: 'Zap', permisos: ['automatizador.ver'], modulo: 'automatizador', fase: 1 },
    ],
  },
  {
    titulo: 'Sistema',
    items: [
      { href: '/administracion/usuarios', label: 'Usuarios', icon: 'Cog', permisos: ['admin.usuarios.ver'], fase: 1 },
      { href: '/administracion/roles', label: 'Roles y permisos', icon: 'Cog', permisos: ['admin.roles.gestionar'], fase: 1 },
      { href: '/administracion/auditoria', label: 'Auditoría', icon: 'Cog', permisos: ['admin.auditoria.ver'], fase: 1 },
      { href: '/administracion/modulos', label: 'Módulos opcionales', icon: 'Cog', permisos: ['admin.modulos.activar'], fase: 1 },
      { href: '/administracion/integraciones', label: 'Integraciones', icon: 'Plug', permisos: ['admin.integraciones.gestionar'], fase: 1 },
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
