import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/layout/page-header';
import { fmtDateTime } from '@/lib/datetime';
import { obtenerBitacoraRegla } from '../actions';

export const metadata: Metadata = { title: 'Bitácora de la regla' };

export default async function BitacoraReglaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ejecuciones = await obtenerBitacoraRegla(id);

  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <Link href="/automatizador" className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Automatizador
      </Link>
      <PageHeader titulo="Bitácora de ejecución" descripcion="Últimas 100 ejecuciones de esta regla — para depurar por qué (no) se disparó." />

      {ejecuciones.length === 0 ? (
        <EmptyState titulo="Sin ejecuciones todavía" descripcion="Se registrará una fila aquí cada vez que el cron diario encuentre un candidato que cumpla las condiciones." />
      ) : (
        <div className="space-y-2">
          {ejecuciones.map((e) => (
            <Card key={e.id}>
              <CardContent className="space-y-1 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-2xs text-muted-foreground">
                    {e.entidad} · {fmtDateTime(e.createdAt)}
                  </span>
                  <Badge variant={e.resultado === 'EJECUTADA' ? 'success' : 'destructive'}>{e.resultado}</Badge>
                </div>
                <pre className="overflow-x-auto rounded-[6px] bg-muted/50 p-2 text-2xs">{JSON.stringify(e.detalle, null, 2)}</pre>
                {e.duracionMs !== null ? <p className="text-2xs text-muted-foreground">{e.duracionMs} ms</p> : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
