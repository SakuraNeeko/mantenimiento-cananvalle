'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ClipboardList, ScanLine, MessageSquareWarning, CircleUserRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePendientesSync } from '@/lib/movil/sync-manager';

const ITEMS = [
  { href: '/movil/mis-ordenes', label: 'Mis OT', icon: ClipboardList },
  { href: '/movil/escanear', label: 'Escanear', icon: ScanLine },
  { href: '/movil/solicitudes', label: 'Solicitudes', icon: MessageSquareWarning },
  { href: '/movil/perfil', label: 'Perfil', icon: CircleUserRound },
] as const;

/** Navegación inferior — botones de 44px+ pensados para usarse con guantes (§"Experiencia móvil"). */
export function BottomNav() {
  const pathname = usePathname();
  const pendientes = usePendientesSync();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t bg-card pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto grid max-w-md grid-cols-4">
        {ITEMS.map((item) => {
          const activo = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          const esPerfil = item.href === '/movil/perfil';
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-2xs',
                activo ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              <Icon className="h-5 w-5" aria-hidden />
              {item.label}
              {esPerfil && pendientes > 0 ? (
                <span className="absolute right-[22%] top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                  {pendientes > 99 ? '99+' : pendientes}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
