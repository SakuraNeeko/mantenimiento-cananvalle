import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasPermission, requirePermission } from '@/lib/permissions';
import { obtenerOpcionesPlan } from '../actions';
import { obtenerPlanDetalle } from './data';
import { PlanGeneralClient } from './plan-general-client';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const detalle = await obtenerPlanDetalle(id);
  return { title: detalle?.plan.codigo ?? 'Plan de mantenimiento' };
}

export default async function PlanGeneralPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requirePermission('planes.ver');
  const detalle = await obtenerPlanDetalle(id);
  if (!detalle) notFound();

  const { plan } = detalle;
  const opciones = await obtenerOpcionesPlan().catch(() => ({ clases: [], maintenanceTypes: [], workTypes: [], assets: [], locations: [], responsables: [] }));

  return (
    <div className="mx-auto max-w-3xl">
      <PlanGeneralClient
        planId={id}
        valoresPrevios={{
          codigo: plan.codigo,
          nombre: plan.nombre,
          maintenanceTypeId: plan.maintenanceTypeId ?? undefined,
          workTypeId: plan.workTypeId ?? undefined,
          alcance: plan.alcance,
          assetId: plan.assetId ?? undefined,
          claseFiltroId: plan.claseFiltroId ?? undefined,
          criticidadFiltro: plan.criticidadFiltro ?? undefined,
          locationFiltro: plan.locationFiltro ?? undefined,
          responsibleDefaultId: plan.responsibleDefaultId ?? undefined,
          prioridad: plan.prioridad,
          tiempoEstimadoHoras: plan.tiempoEstimadoHoras ?? undefined,
          instrucciones: plan.instrucciones ?? undefined,
        }}
        opciones={opciones}
        detalle={{
          assetNombre: detalle.assetNombre,
          assetCodigo: detalle.assetCodigo,
          maintenanceTypeNombre: detalle.maintenanceTypeNombre,
          workTypeNombre: detalle.workTypeNombre,
          locationFiltroNombre: detalle.locationFiltroNombre,
          responsableNombre: detalle.responsableNombre,
          claseFiltroNombre: detalle.claseFiltroNombre,
        }}
        puedeEditar={hasPermission(session, 'planes.gestionar')}
      />
    </div>
  );
}
