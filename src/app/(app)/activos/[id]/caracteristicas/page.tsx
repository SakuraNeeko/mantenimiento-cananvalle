import { notFound } from 'next/navigation';
import { and, eq, isNull, or } from 'drizzle-orm';
import { db } from '@/db';
import { assetCharacteristics, characteristics } from '@/db/schema';
import { requirePermission } from '@/lib/permissions';
import { getCurrentTenant } from '@/lib/tenant';
import { obtenerActivoDetalle } from '../data';
import { CaracteristicasForm, type CaracteristicaConValor } from './caracteristicas-form';

export default async function CaracteristicasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePermission('activos.ver');
  const tenant = await getCurrentTenant();

  const detalle = await obtenerActivoDetalle(id);
  if (!detalle) notFound();

  const [definiciones, valores] = await Promise.all([
    db
      .select({ id: characteristics.id, nombre: characteristics.nombre, tipoDato: characteristics.tipoDato, opciones: characteristics.opciones, ayuda: characteristics.descripcion })
      .from(characteristics)
      .where(
        and(
          eq(characteristics.tenantId, tenant.id),
          eq(characteristics.activo, true),
          isNull(characteristics.deletedAt),
          or(detalle.claseCodigo ? eq(characteristics.claseActivo, detalle.claseCodigo) : undefined, isNull(characteristics.claseActivo)),
        ),
      )
      .orderBy(characteristics.nombre),
    db.select({ characteristicId: assetCharacteristics.characteristicId, valor: assetCharacteristics.valor }).from(assetCharacteristics).where(eq(assetCharacteristics.assetId, id)),
  ]);

  const valorPorId = new Map(valores.map((v) => [v.characteristicId, v.valor]));
  const items: CaracteristicaConValor[] = definiciones.map((d) => ({
    id: d.id,
    nombre: d.nombre,
    tipoDato: d.tipoDato,
    opciones: d.opciones,
    ayuda: d.ayuda,
    valor: valorPorId.get(d.id) ?? null,
  }));

  return <CaracteristicasForm assetId={id} items={items} />;
}
