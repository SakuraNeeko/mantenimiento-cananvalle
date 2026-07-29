'use server';

import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { assetStatusHistory } from '@/db/schema';
import { requirePermission } from '@/lib/permissions';

export async function obtenerHistorialEstado(assetId: string) {
  await requirePermission('activos.hoja_vida.ver');
  return db
    .select({
      id: assetStatusHistory.id,
      fecha: assetStatusHistory.fecha,
      estadoAnterior: assetStatusHistory.estadoAnterior,
      estadoNuevo: assetStatusHistory.estadoNuevo,
      motivo: assetStatusHistory.motivo,
    })
    .from(assetStatusHistory)
    .where(eq(assetStatusHistory.assetId, assetId))
    .orderBy(desc(assetStatusHistory.fecha));
}
