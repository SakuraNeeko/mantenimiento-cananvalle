import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { fmtDateTime } from '@/lib/datetime';
import { ESTADO_LABELS, ESTADO_VARIANT } from '@/lib/validators/orden';
import { obtenerHistorialOrden } from '../../actions';
import { obtenerOrdenDetalle } from '../data';

export default async function OrdenHistorialPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detalle = await obtenerOrdenDetalle(id);
  if (!detalle) notFound();

  const historial = await obtenerHistorialOrden(id);

  return (
    <div className="mx-auto max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>Historial de estados</CardTitle>
        </CardHeader>
        <CardContent>
          {historial.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin cambios de estado registrados.</p>
          ) : (
            <div className="space-y-2">
              {historial.map((h) => (
                <div key={h.id} className="flex items-start justify-between gap-2 rounded-[6px] border p-2 text-sm">
                  <div>
                    <div className="flex items-center gap-1.5">
                      {h.estadoAnterior ? (
                        <>
                          <Badge variant={ESTADO_VARIANT[h.estadoAnterior] ?? 'neutral'}>{ESTADO_LABELS[h.estadoAnterior] ?? h.estadoAnterior}</Badge>
                          <span className="text-muted-foreground">→</span>
                        </>
                      ) : null}
                      <Badge variant={ESTADO_VARIANT[h.estadoNuevo] ?? 'neutral'}>{ESTADO_LABELS[h.estadoNuevo] ?? h.estadoNuevo}</Badge>
                    </div>
                    {h.motivo ? <p className="mt-1 text-muted-foreground">{h.motivo}</p> : null}
                    <p className="text-2xs text-muted-foreground">{h.autorNombre ?? 'Sistema'}</p>
                  </div>
                  <span className="shrink-0 text-2xs text-muted-foreground">{fmtDateTime(h.fecha)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
