'use server';

import { and, eq, ilike, isNull, or } from 'drizzle-orm';
import { db } from '@/db';
import { assets, materials, serviceRequests, workOrders } from '@/db/schema';
import { requireSession } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { getCurrentTenant } from '@/lib/tenant';

export type ResultadoBusqueda = { grupo: 'Activos' | 'Órdenes de trabajo' | 'Materiales' | 'Solicitudes'; id: string; titulo: string; subtitulo: string; href: string };

const LIMITE_POR_GRUPO = 5;

/**
 * Buscador global de la topbar (⌘K) — antes el botón decía "Fase 2" y
 * estaba deshabilitado desde la Fase 1; nunca se implementó. Busca por
 * código/consecutivo o nombre/descripción, respetando qué módulos puede
 * ver cada usuario (no tiene sentido devolver una OT a quien no tiene
 * `ordenes.ver`).
 */
export async function buscarGlobal(query: string): Promise<ResultadoBusqueda[]> {
  const session = await requireSession();
  const texto = query.trim();
  if (texto.length < 2) return [];

  const tenant = await getCurrentTenant();
  const like = `%${texto}%`;
  const resultados: ResultadoBusqueda[] = [];

  if (hasPermission(session, 'activos.ver')) {
    const filas = await db
      .select({ id: assets.id, codigo: assets.codigo, nombre: assets.nombre })
      .from(assets)
      .where(and(eq(assets.tenantId, tenant.id), isNull(assets.deletedAt), or(ilike(assets.codigo, like), ilike(assets.nombre, like))))
      .limit(LIMITE_POR_GRUPO);
    resultados.push(...filas.map((f) => ({ grupo: 'Activos' as const, id: f.id, titulo: f.nombre, subtitulo: f.codigo, href: `/activos/${f.id}` })));
  }

  if (hasPermission(session, 'ordenes.ver')) {
    const filas = await db
      .select({ id: workOrders.id, consecutivo: workOrders.consecutivo, descripcion: workOrders.descripcionProblema })
      .from(workOrders)
      .where(
        and(
          eq(workOrders.tenantId, tenant.id),
          isNull(workOrders.deletedAt),
          or(ilike(workOrders.consecutivo, like), ilike(workOrders.descripcionProblema, like)),
        ),
      )
      .limit(LIMITE_POR_GRUPO);
    resultados.push(
      ...filas.map((f) => ({ grupo: 'Órdenes de trabajo' as const, id: f.id, titulo: f.descripcion, subtitulo: f.consecutivo ?? 'Borrador', href: `/ordenes/${f.id}` })),
    );
  }

  if (hasPermission(session, 'almacen.materiales.ver')) {
    const filas = await db
      .select({ id: materials.id, codigo: materials.codigo, nombre: materials.nombre })
      .from(materials)
      .where(and(eq(materials.tenantId, tenant.id), isNull(materials.deletedAt), or(ilike(materials.codigo, like), ilike(materials.nombre, like))))
      .limit(LIMITE_POR_GRUPO);
    resultados.push(...filas.map((f) => ({ grupo: 'Materiales' as const, id: f.id, titulo: f.nombre, subtitulo: f.codigo, href: `/almacen/materiales/${f.id}` })));
  }

  if (hasPermission(session, 'solicitudes.ver')) {
    const filas = await db
      .select({ id: serviceRequests.id, consecutivo: serviceRequests.consecutivo, descripcion: serviceRequests.descripcion })
      .from(serviceRequests)
      .where(
        and(
          eq(serviceRequests.tenantId, tenant.id),
          isNull(serviceRequests.deletedAt),
          or(ilike(serviceRequests.consecutivo, like), ilike(serviceRequests.descripcion, like)),
        ),
      )
      .limit(LIMITE_POR_GRUPO);
    resultados.push(
      ...filas.map((f) => ({ grupo: 'Solicitudes' as const, id: f.id, titulo: f.descripcion, subtitulo: f.consecutivo ?? 'Borrador', href: `/solicitudes/${f.id}` })),
    );
  }

  return resultados;
}
