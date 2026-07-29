import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { serviceRequests, users } from '@/db/schema';
import { requireSession } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { PageHeader } from '@/components/layout/page-header';
import { obtenerNotas } from '@/app/(app)/solicitudes/actions';
import { EvaluarClient } from './evaluar-client';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const [sr] = await db.select({ consecutivo: serviceRequests.consecutivo }).from(serviceRequests).where(eq(serviceRequests.id, id)).limit(1);
  return { title: sr?.consecutivo ?? 'Solicitud' };
}

export default async function EvaluarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();

  const [sr] = await db
    .select({
      id: serviceRequests.id,
      consecutivo: serviceRequests.consecutivo,
      fecha: serviceRequests.fecha,
      descripcion: serviceRequests.descripcion,
      prioridad: serviceRequests.prioridad,
      estado: serviceRequests.estado,
      solicitanteUserId: serviceRequests.solicitanteUserId,
      responsableNombre: users.nombre,
      solucionAplicada: serviceRequests.solucionAplicada,
      calificacion: serviceRequests.calificacion,
      comentarioCalificacion: serviceRequests.comentarioCalificacion,
    })
    .from(serviceRequests)
    .leftJoin(users, eq(users.id, serviceRequests.responsableUserId))
    .where(eq(serviceRequests.id, id))
    .limit(1);

  if (!sr || sr.solicitanteUserId !== session.user.id) notFound();

  const notas = await obtenerNotas(id, true);

  return (
    <div className="space-y-3">
      <PageHeader titulo="Tu solicitud" />
      <EvaluarClient solicitud={sr} notas={notas} puedeCalificar={hasPermission(session, 'solicitudes.calificar')} />
    </div>
  );
}
