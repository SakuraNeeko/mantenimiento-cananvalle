'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { fmtDateTime } from '@/lib/datetime';
import { formatMoney } from '@/lib/utils';
import { enviarAHistoria } from '../actions';

type Elegible = { id: string; consecutivo: string | null; assetCodigo: string | null; assetNombre: string | null; costoTotal: string; cerradaAt: Date | null };

export function EnviarClient({ elegibles }: { elegibles: Elegible[] }) {
  const router = useRouter();
  const [seleccion, setSeleccion] = React.useState<Set<string>>(new Set(elegibles.map((e) => e.id)));
  const [enviando, setEnviando] = React.useState(false);

  function alternar(id: string) {
    setSeleccion((prev) => {
      const copia = new Set(prev);
      if (copia.has(id)) copia.delete(id);
      else copia.add(id);
      return copia;
    });
  }

  async function enviar() {
    setEnviando(true);
    const resultado = await enviarAHistoria(Array.from(seleccion));
    setEnviando(false);

    if (resultado.enviadas > 0) toast.success(`${resultado.enviadas} orden(es) enviada(s) a historia.`);
    if (resultado.errores.length > 0) {
      resultado.errores.forEach((e) => toast.error(e.error));
    }
    if (resultado.enviadas > 0) router.push('/historia');
    else router.refresh();
  }

  if (elegibles.length === 0) {
    return <EmptyState icon={Send} titulo="No hay órdenes cerradas por enviar" descripcion="Cuando cierres una orden de trabajo, aparecerá aquí lista para enviarse a historia." />;
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Órdenes cerradas ({elegibles.length})</CardTitle>
          <Button onClick={enviar} loading={enviando} disabled={seleccion.size === 0}>
            <Send aria-hidden />
            Enviar {seleccion.size} a historia
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {elegibles.map((e) => (
            <label key={e.id} className="flex items-center gap-2 rounded-[6px] border p-2 text-sm">
              <Checkbox checked={seleccion.has(e.id)} onCheckedChange={() => alternar(e.id)} />
              <div className="flex-1">
                <span className="font-codigo text-xs">{e.consecutivo}</span>{' '}
                <span className="text-muted-foreground">
                  {e.assetCodigo} — {e.assetNombre}
                </span>
              </div>
              <span className="tabular text-2xs text-muted-foreground">{e.cerradaAt ? fmtDateTime(e.cerradaAt) : ''}</span>
              <span className="tabular font-medium">{formatMoney(e.costoTotal)}</span>
            </label>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
