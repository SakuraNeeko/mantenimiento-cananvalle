import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { fmtDateTime } from '@/lib/datetime';
import { hasPermission, requirePermission } from '@/lib/permissions';
import { obtenerComentariosOrden, obtenerOpcionesOrden } from '../actions';
import { obtenerOrdenDetalle } from './data';
import { ComentariosPanel } from './comentarios-panel';
import { EditarOrdenClient } from './editar-orden-client';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const detalle = await obtenerOrdenDetalle(id);
  return { title: detalle?.orden.consecutivo ?? 'Orden de trabajo' };
}

export default async function OrdenGeneralPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requirePermission('ordenes.ver');
  const detalle = await obtenerOrdenDetalle(id);
  if (!detalle) notFound();
  const { orden } = detalle;

  if (orden.estado === 'BORRADOR' && hasPermission(session, 'ordenes.editar')) {
    const opciones = await obtenerOpcionesOrden();
    return (
      <div className="mx-auto max-w-2xl">
        <EditarOrdenClient
          ordenId={id}
          opciones={opciones}
          valoresPrevios={{
            descripcionProblema: orden.descripcionProblema,
            prioridad: orden.prioridad,
            criticidad: orden.criticidad,
            assetId: orden.assetId ?? undefined,
            locationId: orden.locationId ?? undefined,
            costCenterId: orden.costCenterId ?? undefined,
            responsibleCenterId: orden.responsibleCenterId ?? undefined,
            maintenanceTypeId: orden.maintenanceTypeId ?? undefined,
            workTypeId: orden.workTypeId ?? undefined,
            causaFallaId: orden.causaFallaId ?? undefined,
            efectoFallaId: orden.efectoFallaId ?? undefined,
            technicalActionId: orden.technicalActionId ?? undefined,
            requiereParo: orden.requiereParo,
            permisoTrabajoRequerido: orden.permisoTrabajoRequerido,
            tiempoEstimadoHoras: orden.tiempoEstimadoHoras ?? undefined,
          }}
        />
      </div>
    );
  }

  const comentarios = await obtenerComentariosOrden(id);

  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <Card>
        <CardHeader>
          <CardTitle>Descripción del problema</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{orden.descripcionProblema}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Clasificación</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
          <Campo etiqueta="Activo" valor={detalle.assetCodigo && detalle.assetNombre ? `${detalle.assetCodigo} — ${detalle.assetNombre}` : detalle.assetNombre} />
          <Campo etiqueta="Ubicación" valor={detalle.locationNombre} />
          <Campo etiqueta="Centro de costo" valor={detalle.costCenterNombre} />
          <Campo etiqueta="Centro responsable" valor={detalle.responsibleCenterNombre} />
          <Campo etiqueta="Tipo de mantenimiento" valor={detalle.maintenanceTypeNombre} />
          <Campo etiqueta="Tipo de trabajo" valor={detalle.workTypeNombre} />
          <Campo etiqueta="Causa de falla" valor={detalle.causaFallaNombre} />
          <Campo etiqueta="Efecto de falla" valor={detalle.efectoFallaNombre} />
          <Campo etiqueta="Acción técnica" valor={detalle.technicalActionNombre} />
          <Campo etiqueta="Responsable principal" valor={detalle.responsableNombre} />
          <Campo etiqueta="Tercero / Contratista" valor={detalle.partyNombre} />
          <Campo etiqueta="Almacén" valor={detalle.warehouseNombre} />
          <Campo etiqueta="Fecha programada" valor={fmtDateTime(orden.fechaProgramada)} />
          <Campo etiqueta="Inicio real" valor={fmtDateTime(orden.fechaInicioReal)} />
          <Campo etiqueta="Fin real" valor={fmtDateTime(orden.fechaFinReal)} />
          <Campo etiqueta="Tiempo estimado" valor={orden.tiempoEstimadoHoras ? `${orden.tiempoEstimadoHoras} h` : null} />
          {detalle.solicitudConsecutivo ? <Campo etiqueta="Solicitud de origen" valor={detalle.solicitudConsecutivo} /> : null}
          <div>
            <p className="text-2xs text-muted-foreground">Requiere paro</p>
            <Badge variant={orden.requiereParo ? 'warning' : 'neutral'}>{orden.requiereParo ? 'Sí' : 'No'}</Badge>
          </div>
          <div>
            <p className="text-2xs text-muted-foreground">Permiso de trabajo</p>
            <Badge variant={orden.permisoTrabajoRequerido ? 'warning' : 'neutral'}>{orden.permisoTrabajoRequerido ? 'Requerido' : 'No requerido'}</Badge>
          </div>
        </CardContent>
      </Card>

      {orden.motivoPendiente || orden.motivoCancelacion || detalle.causaPendienteNombre || detalle.causaCierreNombre ? (
        <Card>
          <CardHeader>
            <CardTitle>Notas de estado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {detalle.causaPendienteNombre ? (
              <div>
                <p className="text-2xs text-muted-foreground">Causa pendiente</p>
                <p>{detalle.causaPendienteNombre}{orden.motivoPendiente ? ` — ${orden.motivoPendiente}` : ''}</p>
              </div>
            ) : null}
            {orden.motivoCancelacion ? (
              <div>
                <p className="text-2xs text-muted-foreground">Motivo de cancelación</p>
                <p>{orden.motivoCancelacion}</p>
              </div>
            ) : null}
            {detalle.causaCierreNombre ? (
              <div>
                <p className="text-2xs text-muted-foreground">Causa de cierre</p>
                <p>{detalle.causaCierreNombre}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Bitácora</CardTitle>
        </CardHeader>
        <CardContent>
          <ComentariosPanel ordenId={id} comentariosIniciales={comentarios} />
        </CardContent>
      </Card>
    </div>
  );
}

function Campo({ etiqueta, valor }: { etiqueta: string; valor: string | null | undefined }) {
  if (!valor) return null;
  return (
    <div>
      <p className="text-2xs text-muted-foreground">{etiqueta}</p>
      <p>{valor}</p>
    </div>
  );
}
