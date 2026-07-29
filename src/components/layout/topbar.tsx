'use client';

import { useTheme } from 'next-themes';
import Link from 'next/link';
import { Bell, LogOut, MessageSquareWarning, Moon, Search, Sun, User } from 'lucide-react';
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

export type TopbarProps = {
  nombre: string;
  email: string;
  roles: string[];
  sedes: { id: string; nombre: string }[];
  sedeActual: string | null;
  notificacionesSinLeer: number;
};

export function Topbar({ nombre, email, roles, sedes, sedeActual, notificacionesSinLeer }: TopbarProps) {
  const { theme, setTheme } = useTheme();
  const sede = sedes.find((s) => s.id === sedeActual);

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b bg-card px-3">
      {sedes.length > 1 ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              {sede?.nombre ?? 'Todas las sedes'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Sede activa</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {sedes.map((s) => (
              <DropdownMenuItem key={s.id}>{s.nombre}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <span className="text-xs font-medium text-muted-foreground">{sede?.nombre ?? ''}</span>
      )}

      <Button
        variant="outline"
        size="sm"
        className="ml-2 hidden min-w-[16rem] justify-start text-muted-foreground md:inline-flex"
        title="Buscador global (Fase 2)"
        disabled
      >
        <Search aria-hidden />
        Buscar activos, OT, materiales…
        <kbd className="ml-auto font-codigo text-2xs">⌘K</kbd>
      </Button>

      <div className="ml-auto flex items-center gap-1">
        <Button variant="ghost" size="icon" className="relative" aria-label="Notificaciones">
          <Bell aria-hidden />
          {notificacionesSinLeer > 0 ? (
            <Badge variant="destructive" className="absolute -right-0.5 -top-0.5 h-4 min-w-4 justify-center px-1">
              {notificacionesSinLeer > 9 ? '9+' : notificacionesSinLeer}
            </Badge>
          ) : null}
        </Button>

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
                    {r}
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
