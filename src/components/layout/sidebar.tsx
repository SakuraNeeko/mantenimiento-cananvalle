'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  BarChart3,
  Boxes,
  CalendarClock,
  Car,
  ClipboardCheck,
  ClipboardList,
  Cog,
  Fuel,
  Gauge,
  History,
  Layers,
  LifeBuoy,
  MessageSquareWarning,
  PanelLeftClose,
  PanelLeftOpen,
  Plug,
  ShieldAlert,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { IconName, NavGroup } from './nav-config';
import { useSidebarMobile } from './sidebar-mobile-context';

/** Resuelve el nombre de ícono (string, ver nav-config.ts) al componente real — solo existe en el cliente. */
const ICONS: Record<IconName, LucideIcon> = {
  Gauge,
  Wrench,
  MessageSquareWarning,
  ShieldAlert,
  CalendarClock,
  Activity,
  Boxes,
  Layers,
  ClipboardCheck,
  LifeBuoy,
  History,
  BarChart3,
  Fuel,
  ClipboardList,
  Zap,
  Cog,
  Plug,
  Car,
};

export function Sidebar({ grupos, empresa }: { grupos: NavGroup[]; empresa: string }) {
  const pathname = usePathname();
  const [colapsado, setColapsado] = React.useState(false);
  const { abierto, cerrar } = useSidebarMobile();

  // Al navegar desde el cajón móvil, se cierra solo — si no, taparía la página recién abierta.
  React.useEffect(() => {
    cerrar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <>
      {abierto ? (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={cerrar} aria-hidden />
      ) : null}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-60 shrink-0 flex-col border-r bg-card md:static md:z-auto md:flex',
          abierto ? 'flex' : 'hidden',
          colapsado ? 'md:w-14' : 'md:w-60',
        )}
        aria-label="Navegación principal"
      >
      <div className="flex h-12 items-center gap-2 border-b px-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] bg-primary text-primary-foreground">
          <span className="font-codigo text-xs font-bold">GM</span>
        </div>
        {!colapsado ? (
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold leading-tight">{empresa}</p>
            <p className="text-2xs text-muted-foreground">Gestión de mantenimiento</p>
          </div>
        ) : null}
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {grupos.map((grupo) => (
          <div key={grupo.titulo} className="mb-3">
            {!colapsado ? (
              <p className="px-2 pb-1 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                {grupo.titulo}
              </p>
            ) : null}
            <ul className="space-y-0.5">
              {grupo.items.map((item) => {
                const activo = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const proximo = item.fase > 1;
                const Icon = ICONS[item.icon];
                return (
                  <li key={item.href}>
                    <Link
                      href={proximo ? '#' : item.href}
                      aria-current={activo ? 'page' : undefined}
                      aria-disabled={proximo}
                      title={colapsado ? item.label : undefined}
                      className={cn(
                        'flex items-center gap-2 rounded-[6px] px-2 py-1.5 text-sm transition-colors',
                        activo
                          ? 'bg-accent font-medium text-accent-foreground'
                          : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                        proximo && 'pointer-events-none opacity-45',
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden />
                      {!colapsado ? (
                        <>
                          <span className="truncate">{item.label}</span>
                          {proximo ? (
                            <Badge variant="neutral" className="ml-auto shrink-0">
                              F{item.fase}
                            </Badge>
                          ) : null}
                        </>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="hidden border-t p-2 md:block">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          onClick={() => setColapsado((v) => !v)}
          aria-label={colapsado ? 'Expandir menú' : 'Colapsar menú'}
        >
          {colapsado ? <PanelLeftOpen aria-hidden /> : <PanelLeftClose aria-hidden />}
          {!colapsado ? <span>Colapsar</span> : null}
        </Button>
      </div>
      </aside>
    </>
  );
}
