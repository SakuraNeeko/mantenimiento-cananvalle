'use server';

import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { assetClasses, assets } from '@/db/schema';
import { requirePermission } from '@/lib/permissions';
import { getCurrentTenant } from '@/lib/tenant';

/** Búsqueda manual por código — respaldo cuando el navegador no soporta `BarcodeDetector` (Safari/iOS, principalmente). */
export async function buscarActivoPorCodigo(codigo: string): Promise<{ id: string } | null> {
  await requirePermission('activos.ver');
  const tenant = await getCurrentTenant();
  const [activo] = await db
    .select({ id: assets.id })
    .from(assets)
    .where(and(eq(assets.tenantId, tenant.id), eq(assets.codigo, codigo.trim()), isNull(assets.deletedAt)))
    .limit(1);
  return activo ?? null;
}

export type ActivoMovil = {
  id: string;
  codigo: string;
  nombre: string;
  clase: string | null;
  criticidad: string;
  estado: string | null;
  ubicacion: string | null;
};

export async function obtenerActivoMovil(id: string): Promise<ActivoMovil | null> {
  await requirePermission('activos.ver');
  const tenant = await getCurrentTenant();
  const { locations } = await import('@/db/schema');
  const [activo] = await db
    .select({
      id: assets.id,
      codigo: assets.codigo,
      nombre: assets.nombre,
      clase: assetClasses.nombre,
      criticidad: assets.criticidad,
      estado: assets.estado,
      ubicacion: locations.nombre,
    })
    .from(assets)
    .leftJoin(assetClasses, eq(assetClasses.id, assets.claseId))
    .leftJoin(locations, eq(locations.id, assets.locationId))
    .where(and(eq(assets.tenantId, tenant.id), eq(assets.id, id), isNull(assets.deletedAt)))
    .limit(1);
  return activo ?? null;
}
