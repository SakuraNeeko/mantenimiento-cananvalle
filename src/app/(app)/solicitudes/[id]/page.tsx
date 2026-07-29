import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { alias } from 'drizzle-orm/pg-core';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { assets, locations, serviceRequests, sites, users, workTypes } from '@/db/schema';
import { hasPermission, requirePermission } from '@/lib/permissions';
import { getCurrentTenant } from '@/lib/tenant';
import { PageHeader } from '@/components/layout/page-header';
import { obtenerNotas, obtenerOpcionesSolicitud, obtenerResponsablesDisponibles } from '../actions';
import { SolicitudDetalleClient } from './solicitud-detalle-client';

const solicitantes = alias(users, 'solicitantes_detalle');
const responsables = alias(users, 'responsables_detalle');

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const tenant = await getCurrentTenant();
  const [sr] = await db.select({ consecutivo: serviceRequests.consecutivo }).from(serviceRequests).where(and(eq(serviceRequests.id, id), eq(serviceRequests.tenantId, tenant.id))).limit(1);
  return { title: sr?.consecutivo ?? 'Solicitud' };
}

export default async function SolicitudDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requirePermission('solicitudes.ver');
  const tenant = await getCurrentTenant();

  const [sr] = await db
    .select({
      id: serviceRequests.id,
      consecutivo: serviceRequests.consecutivo,
      fecha: serviceRequests.fecha,
      descripcion: serviceRequests.descripcion,
      prioridad: serviceRequests.prioridad,
      estado: serviceRequests.estado,
      solicitanteUserId: serviceRequests.solicitanteUserId,
      solicitanteNombre: solicitantes.nombre,
      responsableUserId: serviceRequests.responsableUserId,
      responsableNombre: responsables.nombre,
      assetNombre: assets.nombre,
      locationNombre: locations.nombre,
      siteNombre: sites.nombre,
      workTypeNombre: workTypes.nombre,
      fechaCompromiso: serviceRequests.fechaCompromiso,
      fechaAtencion: serviceRequests.fechaAtencion,
      solucionAplicada: serviceRequests.solucionAplicada,
      esAtencionDirecta: serviceRequests.esAtencionDirecta,
      causaRechazo: serviceRequests.causaRechazo,
      calificacion: serviceRequests.calificacion,
      comentarioCalificacion: serviceRequests.comentarioCalificacion,
    })
    .from(serviceRequests)
    .innerJoin(solicitantes, eq(solicitantes.id, serviceRequests.solicitanteUserId))
    .leftJoin(responsables, eq(responsables.id, serviceRequests.responsableUserId))
    .leftJoin(assets, eq(assets.id, serviceRequests.assetId))
    .leftJoin(locations, eq(locations.id, serviceRequests.locationId))
    .leftJoin(sites, eq(sites.id, serviceRequests.siteId))
    .leftJoin(workTypes, eq(workTypes.id, serviceRequests.workTypeId))
    .where(and(eq(serviceRequests.id, id), eq(serviceRequests.tenantId, tenant.id)))
    .limit(1);
  if (!sr) notFound();

  const [notas, opciones] = await Promise.all([obtenerNotas(id, false), obtenerOpcionesSolicitud().catch(() => null)]);
  const responsablesDisponibles = hasPermission(session, 'solicitudes.asignar') ? await obtenerResponsablesDisponibles() : [];

  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <PageHeader titulo={sr.consecutivo ?? 'Borrador'} descripcion={sr.descripcion.slice(0, 120)} />
      <SolicitudDetalleClient
        solicitud={sr}
        notas={notas}
        opciones={opciones}
        responsables={responsablesDisponibles}
        currentUserId={session.user.id}
        permisos={{
          editar: hasPermission(session, 'solicitudes.editar'),
          aprobar: hasPermission(session, 'solicitudes.aprobar'),
          rechazar: hasPermission(session, 'solicitudes.rechazar'),
          asignar: hasPermission(session, 'solicitudes.asignar'),
          atender: hasPermission(session, 'solicitudes.atender'),
          atencionDirecta: hasPermission(session, 'solicitudes.atencion_directa'),
          cerrar: hasPermission(session, 'solicitudes.cerrar'),
          calificar: hasPermission(session, 'solicitudes.calificar'),
        }}
      />
    </div>
  );
}
