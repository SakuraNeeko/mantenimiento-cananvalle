import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { adverseEvents, assets, users } from '@/db/schema';
import { hasPermission, requirePermission } from '@/lib/permissions';
import { getCurrentTenant } from '@/lib/tenant';
import { requireModulo } from '@/lib/tenant/modules';
import { obtenerOpcionesEvento } from '../actions';
import { EventoDetalleClient } from './evento-detalle-client';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const tenant = await getCurrentTenant();
  const [evento] = await db.select({ id: adverseEvents.id }).from(adverseEvents).where(and(eq(adverseEvents.id, id), eq(adverseEvents.tenantId, tenant.id))).limit(1);
  return { title: evento ? 'Evento de tecnovigilancia' : 'No encontrado' };
}

export default async function EventoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requirePermission('tecnovigilancia.ver');
  const tenant = await getCurrentTenant();
  await requireModulo(tenant.id, 'tecnovigilancia');

  const [evento] = await db
    .select({
      id: adverseEvents.id,
      assetId: adverseEvents.assetId,
      assetCodigo: assets.codigo,
      assetNombre: assets.nombre,
      tipo: adverseEvents.tipo,
      severidad: adverseEvents.severidad,
      clasificacion: adverseEvents.clasificacion,
      fecha: adverseEvents.fecha,
      descripcion: adverseEvents.descripcion,
      estado: adverseEvents.estado,
      causaRaiz: adverseEvents.causaRaiz,
      accionesCorrectivas: adverseEvents.accionesCorrectivas,
      reportadoAutoridad: adverseEvents.reportadoAutoridad,
      fechaReporte: adverseEvents.fechaReporte,
      numeroReporte: adverseEvents.numeroReporte,
      reportanteNombre: users.nombre,
    })
    .from(adverseEvents)
    .innerJoin(assets, eq(assets.id, adverseEvents.assetId))
    .leftJoin(users, eq(users.id, adverseEvents.reportanteUserId))
    .where(and(eq(adverseEvents.id, id), eq(adverseEvents.tenantId, tenant.id)))
    .limit(1);
  if (!evento) notFound();

  const opciones = await obtenerOpcionesEvento().catch(() => []);

  return (
    <div className="mx-auto max-w-3xl">
      <EventoDetalleClient evento={evento} opciones={opciones} permisos={{ editar: hasPermission(session, 'tecnovigilancia.registrar'), reportar: hasPermission(session, 'tecnovigilancia.reportar') }} />
    </div>
  );
}
