'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { fmtRelative } from '@/lib/datetime';
import { marcarNotificacionLeida, marcarTodasLeidas, obtenerMisNotificaciones, type NotificacionRow } from '@/app/(app)/_lib/notificaciones-actions';

/** La campana del topbar: antes solo mostraba el contador de no leídas, sin ninguna forma de verlas. */
export function NotificacionesMenu({ sinLeerInicial }: { sinLeerInicial: number }) {
  const router = useRouter();
  const [abierto, setAbierto] = React.useState(false);
  const [cargando, setCargando] = React.useState(false);
  const [notificaciones, setNotificaciones] = React.useState<NotificacionRow[]>([]);
  const [sinLeer, setSinLeer] = React.useState(sinLeerInicial);

  function alAbrir(open: boolean) {
    setAbierto(open);
    if (!open) return;
    setCargando(true);
    obtenerMisNotificaciones()
      .then(setNotificaciones)
      .finally(() => setCargando(false));
  }

  async function marcarLeida(n: NotificacionRow) {
    if (n.leidaAt) return;
    setNotificaciones((prev) => prev.map((x) => (x.id === n.id ? { ...x, leidaAt: new Date() } : x)));
    setSinLeer((v) => Math.max(0, v - 1));
    await marcarNotificacionLeida(n.id);
    router.refresh();
  }

  async function marcarTodas() {
    setNotificaciones((prev) => prev.map((x) => ({ ...x, leidaAt: x.leidaAt ?? new Date() })));
    setSinLeer(0);
    await marcarTodasLeidas();
    router.refresh();
  }

  return (
    <DropdownMenu open={abierto} onOpenChange={alAbrir}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notificaciones">
          <Bell aria-hidden />
          {sinLeer > 0 ? (
            <Badge variant="destructive" className="absolute -right-0.5 -top-0.5 h-4 min-w-4 justify-center px-1">
              {sinLeer > 9 ? '9+' : sinLeer}
            </Badge>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          Notificaciones
          {sinLeer > 0 ? (
            <button type="button" onClick={marcarTodas} className="flex items-center gap-1 text-2xs font-normal text-primary hover:underline">
              <CheckCheck className="h-3 w-3" aria-hidden />
              Marcar todas
            </button>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {cargando ? (
          <div className="flex items-center justify-center py-6 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          </div>
        ) : notificaciones.length === 0 ? (
          <p className="px-2 py-4 text-center text-xs text-muted-foreground">Sin notificaciones todavía.</p>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {notificaciones.map((n) => {
              const contenido = (
                <div className="flex flex-col gap-0.5 whitespace-normal">
                  <span className="text-xs font-medium">{n.titulo}</span>
                  {n.cuerpo ? <span className="text-2xs text-muted-foreground">{n.cuerpo}</span> : null}
                  <span className="text-2xs text-muted-foreground">{fmtRelative(n.createdAt)}</span>
                </div>
              );
              return (
                <DropdownMenuItem
                  key={n.id}
                  className={n.leidaAt ? 'opacity-60' : undefined}
                  onSelect={(e) => {
                    e.preventDefault();
                    void marcarLeida(n);
                  }}
                  asChild={Boolean(n.link)}
                >
                  {n.link ? (
                    <Link href={n.link} className="items-start gap-2 py-2">
                      {!n.leidaAt ? <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden /> : null}
                      {contenido}
                    </Link>
                  ) : (
                    <div className="flex items-start gap-2 py-2">
                      {!n.leidaAt ? <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden /> : null}
                      {contenido}
                    </div>
                  )}
                </DropdownMenuItem>
              );
            })}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
