import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { fmtDateTime } from '@/lib/datetime';
import { obtenerHistorialGeneracion } from '../../actions';
import { obtenerPlanDetalle } from '../data';

const RESULTADO_LABELS: Record<string, string> = {
  GENERADA: 'OT generada',
  OMITIDA_DUPLICADO: 'Omitida (ya había una OT abierta)',
  OMITIDA_SIN_PROYECCION: 'Omitida (sin datos para proyectar)',
  OMITIDA_INACTIVO: 'Omitida (disparador o plan inactivo)',
  ERROR: 'Error',
};

const RESULTADO_VARIANT: Record<string, 'success' | 'neutral' | 'warning' | 'destructive'> = {
  GENERADA: 'success',
  OMITIDA_DUPLICADO: 'neutral',
  OMITIDA_SIN_PROYECCION: 'warning',
  OMITIDA_INACTIVO: 'neutral',
  ERROR: 'destructive',
};

export default async function PlanGeneracionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detalle = await obtenerPlanDetalle(id);
  if (!detalle) notFound();

  const historial = await obtenerHistorialGeneracion(id);

  return (
    <div className="mx-auto max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>Trazabilidad de generación</CardTitle>
        </CardHeader>
        <CardContent>
          {historial.length === 0 ? (
            <p className="text-sm text-muted-foreground">Este plan todavía no ha sido evaluado por el generador automático.</p>
          ) : (
            <div className="space-y-2">
              {historial.map((h) => (
                <div key={h.id} className="flex items-start justify-between gap-2 rounded-[6px] border p-2 text-sm">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Badge variant={RESULTADO_VARIANT[h.resultado] ?? 'neutral'}>{RESULTADO_LABELS[h.resultado] ?? h.resultado}</Badge>
                      {h.assetNombre ? <span className="text-muted-foreground">{h.assetNombre}</span> : null}
                    </div>
                    {h.workOrderId ? (
                      <Link href={`/ordenes/${h.workOrderId}`} className="text-2xs text-primary hover:underline">
                        {h.workOrderConsecutivo ?? 'Ver orden'}
                      </Link>
                    ) : null}
                    {h.detalle ? <p className="mt-1 text-2xs text-muted-foreground">{h.detalle}</p> : null}
                  </div>
                  <span className="shrink-0 text-2xs text-muted-foreground">{fmtDateTime(h.fechaEvaluacion)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
