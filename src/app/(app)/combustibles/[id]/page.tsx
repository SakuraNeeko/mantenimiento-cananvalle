import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { alias } from 'drizzle-orm/pg-core';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { assets, fuelRecords, fuels, parties, users } from '@/db/schema';
import { hasPermission, requirePermission } from '@/lib/permissions';
import { getCurrentTenant } from '@/lib/tenant';
import { requireModulo } from '@/lib/tenant/modules';
import { obtenerOpcionesCombustible } from '../actions';
import { CombustibleDetalleClient } from './combustible-detalle-client';

const conductores = alias(users, 'conductores');

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const tenant = await getCurrentTenant();
  const [registro] = await db.select({ numeroFactura: fuelRecords.numeroFactura }).from(fuelRecords).where(and(eq(fuelRecords.id, id), eq(fuelRecords.tenantId, tenant.id))).limit(1);
  return { title: registro ? 'Carga de combustible' : 'No encontrado' };
}

export default async function CombustibleDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requirePermission('combustibles.ver');
  const tenant = await getCurrentTenant();
  await requireModulo(tenant.id, 'combustibles');

  const [registro] = await db
    .select({
      id: fuelRecords.id,
      assetId: fuelRecords.assetId,
      assetCodigo: assets.codigo,
      assetNombre: assets.nombre,
      fuelId: fuelRecords.fuelId,
      fuelNombre: fuels.nombre,
      fecha: fuelRecords.fecha,
      cantidad: fuelRecords.cantidad,
      costoUnitario: fuelRecords.costoUnitario,
      costoTotal: fuelRecords.costoTotal,
      lectura: fuelRecords.lectura,
      partyNombre: parties.nombre,
      conductorNombre: conductores.nombre,
      numeroFactura: fuelRecords.numeroFactura,
      observaciones: fuelRecords.observaciones,
    })
    .from(fuelRecords)
    .innerJoin(assets, eq(assets.id, fuelRecords.assetId))
    .innerJoin(fuels, eq(fuels.id, fuelRecords.fuelId))
    .leftJoin(parties, eq(parties.id, fuelRecords.partyId))
    .leftJoin(conductores, eq(conductores.id, fuelRecords.conductorUserId))
    .where(and(eq(fuelRecords.id, id), eq(fuelRecords.tenantId, tenant.id)))
    .limit(1);
  if (!registro) notFound();

  const opciones = await obtenerOpcionesCombustible().catch(() => ({ assets: [], fuels: [], parties: [], conductores: [] }));

  return (
    <div className="mx-auto max-w-3xl">
      <CombustibleDetalleClient registro={registro} opciones={opciones} permisos={{ editar: hasPermission(session, 'combustibles.editar') }} />
    </div>
  );
}
