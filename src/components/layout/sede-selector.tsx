'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cambiarSedeActiva } from '@/lib/tenant/sede-activa';

/** El selector de sede del topbar — antes no tenía `onSelect`, así que hacer clic en una sede no cambiaba nada. */
export function SedeSelector({
  sedes,
  sedeActual,
  mostrarTodasLasSedes,
}: {
  sedes: { id: string; nombre: string }[];
  sedeActual: string | null;
  mostrarTodasLasSedes: boolean;
}) {
  const router = useRouter();
  const [cambiando, setCambiando] = React.useState(false);
  const sede = sedes.find((s) => s.id === sedeActual);

  async function elegir(siteId: string | null) {
    if (siteId === sedeActual) return;
    setCambiando(true);
    try {
      await cambiarSedeActiva(siteId);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo cambiar de sede.');
    } finally {
      setCambiando(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={cambiando}>
          {cambiando ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
          {sede?.nombre ?? 'Todas las sedes'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>Sede activa</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {mostrarTodasLasSedes ? (
          <DropdownMenuItem onSelect={() => void elegir(null)}>
            {sedeActual === null ? <Check className="h-3.5 w-3.5" aria-hidden /> : <span className="w-3.5" />}
            Todas las sedes
          </DropdownMenuItem>
        ) : null}
        {sedes.map((s) => (
          <DropdownMenuItem key={s.id} onSelect={() => void elegir(s.id)}>
            {s.id === sedeActual ? <Check className="h-3.5 w-3.5" aria-hidden /> : <span className="w-3.5" />}
            {s.nombre}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
