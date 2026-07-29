'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { alternarModulo } from './actions';

type Modulo = { modulo: string; nombre: string; descripcion: string; habilitado: boolean };

export function ModulosClient({ modulos }: { modulos: Modulo[] }) {
  const router = useRouter();
  const [procesando, setProcesando] = React.useState<string | null>(null);

  async function alternar(modulo: string, habilitado: boolean) {
    setProcesando(modulo);
    const resultado = await alternarModulo(modulo, habilitado);
    setProcesando(null);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    toast.success(habilitado ? 'Módulo activado.' : 'Módulo desactivado.');
    router.refresh();
  }

  return (
    <div className="space-y-2">
      {modulos.map((m) => (
        <Card key={m.modulo}>
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="text-sm font-medium">{m.nombre}</p>
              <p className="text-2xs text-muted-foreground">{m.descripcion}</p>
            </div>
            <label className="flex items-center gap-2 text-sm">
              {m.habilitado ? 'Activado' : 'Desactivado'}
              <Checkbox checked={m.habilitado} disabled={procesando === m.modulo} onCheckedChange={(v) => alternar(m.modulo, Boolean(v))} />
            </label>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
