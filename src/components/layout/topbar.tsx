'use client';

import { useTheme } from 'next-themes';
import Link from 'next/link';
import { LogOut, Menu, MessageSquareWarning, Moon, Smartphone, Sun, User } from 'lucide-react';
import { NotificacionesMenu } from './notificaciones-menu';
import { SedeSelector } from './sede-selector';
import { GlobalSearch } from './global-search';
import { useSidebarMobile } from './sidebar-mobile-context';
import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ROLE_DEFS, type RoleCode } from '@/lib/permissions/catalog';

export type TopbarProps = {
  nombre: string;
  email: string;
  roles: string[];
  sedes: { id: string; nombre: string }[];
  sedeActual: string | null;
  mostrarTodasLasSedes: boolean;
  notificacionesSinLeer: number;
};

export function Topbar({ nombre, email, roles, sedes, sedeActual, mostrarTodasLasSedes, notificacionesSinLeer }: TopbarProps) {
  const { theme, setTheme } = useTheme();
  const { alternar } = useSidebarMobile();
  const sede = sedes.find((s) => s.id === sedeActual);

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b bg-card px-2 sm:px-3">
      <Button variant="ghost" size="icon" className="shrink-0 md:hidden" onClick={alternar} aria-label="Abrir menú">
        <Menu aria-hidden />
      </Button>

      {sedes.length > 1 || mostrarTodasLasSedes ? (
        <SedeSelector sedes={sedes} sedeActual={sedeActual} mostrarTodasLasSedes={mostrarTodasLasSedes} />
      ) : (
        <span className="hidden text-xs font-medium text-muted-foreground sm:inline">{sede?.nombre ?? ''}</span>
      )}

      <GlobalSearch />

      <div className="ml-auto flex items-center gap-1">
        <NotificacionesMenu sinLeerInicial={notificacionesSinLeer} />

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label="Cambiar tema"
        >
          <Sun className="hidden dark:block" aria-hidden />
          <Moon className="block dark:hidden" aria-hidden />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-2xs font-semibold text-primary">
                {nombre.slice(0, 2).toUpperCase()}
              </span>
              <span className="hidden sm:inline">{nombre}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel>
              <p className="text-sm font-medium">{nombre}</p>
              <p className="text-2xs font-normal text-muted-foreground">{email}</p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {roles.map((r) => (
                  <Badge key={r} variant="secondary">
                    {ROLE_DEFS[r as RoleCode]?.nombre ?? r}
                  </Badge>
                ))}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User aria-hidden />
              Mi perfil
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/mis-solicitudes">
                <MessageSquareWarning aria-hidden />
                Portal de solicitudes
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/movil/mis-ordenes">
                <Smartphone aria-hidden />
                Vista móvil (técnicos)
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => void signOut({ callbackUrl: '/login' })}>
              <LogOut aria-hidden />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
