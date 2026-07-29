import { and, asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { fuelRecords } from '@/db/schema';

/**
 * Rendimiento y consumo anómalo (§4.10): no se guardan en la tabla, se
 * calculan comparando cada carga con la anterior del mismo activo.
 *
 * Rendimiento = (lectura actual − lectura anterior) ÷ cantidad cargada.
 * Con odómetro (km) da km/gal o km/L; con horómetro (h) da h/gal — la
 * unidad la define el tipo de medición del activo, no este cálculo.
 *
 * Anómalo = el rendimiento de esa carga se desvía más de 30% del promedio
 * de las cargas anteriores del mismo activo. 30% es un umbral fijo,
 * documentado como simplificación — un umbral por clase de activo o
 * calculado estadísticamente (desviación estándar) queda para cuando haya
 * suficiente volumen de datos reales para calibrarlo.
 */

const UMBRAL_ANOMALIA = 0.3;

export type RegistroConRendimiento = {
  id: string;
  fecha: Date;
  cantidad: string;
  costoTotal: string;
  lectura: string | null;
  rendimiento: number | null;
  anomalo: boolean;
};

export async function calcularRendimientoAsset(tenantId: string, assetId: string): Promise<RegistroConRendimiento[]> {
  const registros = await db
    .select({ id: fuelRecords.id, fecha: fuelRecords.fecha, cantidad: fuelRecords.cantidad, costoTotal: fuelRecords.costoTotal, lectura: fuelRecords.lectura })
    .from(fuelRecords)
    .where(and(eq(fuelRecords.tenantId, tenantId), eq(fuelRecords.assetId, assetId)))
    .orderBy(asc(fuelRecords.fecha));

  const resultado: RegistroConRendimiento[] = [];
  const rendimientosPrevios: number[] = [];

  for (let i = 0; i < registros.length; i++) {
    const actual = registros[i]!;
    const anterior = i > 0 ? registros[i - 1] : null;

    let rendimiento: number | null = null;
    if (anterior?.lectura && actual.lectura) {
      const deltaLectura = Number(actual.lectura) - Number(anterior.lectura);
      const cantidad = Number(actual.cantidad);
      if (deltaLectura > 0 && cantidad > 0) rendimiento = deltaLectura / cantidad;
    }

    let anomalo = false;
    if (rendimiento !== null && rendimientosPrevios.length > 0) {
      const promedio = rendimientosPrevios.reduce((s, r) => s + r, 0) / rendimientosPrevios.length;
      if (promedio > 0) anomalo = Math.abs(rendimiento - promedio) / promedio > UMBRAL_ANOMALIA;
    }

    resultado.push({ id: actual.id, fecha: actual.fecha, cantidad: actual.cantidad, costoTotal: actual.costoTotal, lectura: actual.lectura, rendimiento, anomalo });
    if (rendimiento !== null) rendimientosPrevios.push(rendimiento);
  }

  return resultado.reverse();
}
