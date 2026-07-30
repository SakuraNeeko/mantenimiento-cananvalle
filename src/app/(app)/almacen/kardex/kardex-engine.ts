import { and, eq, gt, sql } from 'drizzle-orm';
import type { DbTx } from '@/db';
import { stockLots, warehouseStock } from '@/db/schema';

export type TxClient = Parameters<Parameters<DbTx['transaction']>[0]>[0];

export class KardexError extends Error {}

type LineaEntrada = {
  warehouseId: string;
  materialId: string;
  cantidad: number;
  costoUnitario: number;
  lote: string | null;
  serie: string | null;
  fechaVencimiento: string | null;
  signo: 'ENTRADA' | 'SALIDA';
  afectaCostoPromedio: boolean;
  manejaLote: boolean;
};

type ResultadoLinea = { costoUnitarioAplicado: string; costoTotal: string; saldoResultante: string; loteAplicado: string | null };

/**
 * Aplica UNA línea de kárdex a `warehouse_stock` (y a `stock_lots` si el
 * material maneja lote), dentro de la transacción `tx`. Es el único lugar
 * donde se toca la existencia — tanto `confirmarMovimiento` como
 * `anularMovimiento` (con el signo invertido) pasan por aquí.
 *
 * Regla de oro (§4.4): el costo promedio ponderado se recalcula EN esta
 * misma operación, nunca en un paso aparte.
 */
export async function aplicarLineaKardex(tx: TxClient, tenantId: string, linea: LineaEntrada): Promise<ResultadoLinea> {
  const [stock] = await tx
    .select()
    .from(warehouseStock)
    .where(and(eq(warehouseStock.warehouseId, linea.warehouseId), eq(warehouseStock.materialId, linea.materialId)))
    .for('update');

  const cantidadActual = Number(stock?.cantidad ?? 0);
  const costoPromedioActual = Number(stock?.costoPromedio ?? 0);

  if (linea.signo === 'ENTRADA') {
    const nuevaCantidad = cantidadActual + linea.cantidad;
    const nuevoCostoPromedio = linea.afectaCostoPromedio && nuevaCantidad > 0
      ? (cantidadActual * costoPromedioActual + linea.cantidad * linea.costoUnitario) / nuevaCantidad
      : costoPromedioActual;

    await upsertStock(tx, tenantId, linea.warehouseId, linea.materialId, {
      cantidad: String(nuevaCantidad),
      costoPromedio: String(nuevoCostoPromedio),
      ultimaEntradaAt: new Date(),
    });

    if (linea.manejaLote && linea.lote) {
      await upsertLote(tx, tenantId, linea.warehouseId, linea.materialId, linea.lote, linea.fechaVencimiento, linea.cantidad);
    }

    return {
      costoUnitarioAplicado: String(linea.costoUnitario),
      costoTotal: String(linea.cantidad * linea.costoUnitario),
      saldoResultante: String(nuevaCantidad),
      loteAplicado: linea.lote,
    };
  }

  // SALIDA: se valora al costo promedio vigente, nunca al costo que escriba el usuario.
  if (cantidadActual < linea.cantidad) {
    throw new KardexError(`Existencia insuficiente: hay ${cantidadActual}, se solicitan ${linea.cantidad}.`);
  }

  let loteAplicado = linea.lote;
  if (linea.manejaLote) {
    loteAplicado = await consumirLote(tx, linea.warehouseId, linea.materialId, linea.lote, linea.cantidad);
  }

  const nuevaCantidad = cantidadActual - linea.cantidad;
  await upsertStock(tx, tenantId, linea.warehouseId, linea.materialId, {
    cantidad: String(nuevaCantidad),
    ultimaSalidaAt: new Date(),
  });

  return {
    costoUnitarioAplicado: String(costoPromedioActual),
    costoTotal: String(linea.cantidad * costoPromedioActual),
    saldoResultante: String(nuevaCantidad),
    loteAplicado,
  };
}

async function upsertStock(
  tx: TxClient,
  tenantId: string,
  warehouseId: string,
  materialId: string,
  cambios: { cantidad?: string; costoPromedio?: string; ultimaEntradaAt?: Date; ultimaSalidaAt?: Date },
): Promise<void> {
  const existente = await tx
    .select({ id: warehouseStock.id })
    .from(warehouseStock)
    .where(and(eq(warehouseStock.warehouseId, warehouseId), eq(warehouseStock.materialId, materialId)))
    .limit(1);

  if (existente.length > 0) {
    await tx.update(warehouseStock).set(cambios).where(and(eq(warehouseStock.warehouseId, warehouseId), eq(warehouseStock.materialId, materialId)));
  } else {
    await tx.insert(warehouseStock).values({
      tenantId,
      warehouseId,
      materialId,
      cantidad: cambios.cantidad ?? '0',
      costoPromedio: cambios.costoPromedio ?? '0',
      ultimaEntradaAt: cambios.ultimaEntradaAt,
      ultimaSalidaAt: cambios.ultimaSalidaAt,
    });
  }
}

async function upsertLote(
  tx: TxClient,
  tenantId: string,
  warehouseId: string,
  materialId: string,
  lote: string,
  fechaVencimiento: string | null,
  cantidadAgregar: number,
): Promise<void> {
  const [existente] = await tx
    .select({ id: stockLots.id, cantidad: stockLots.cantidad })
    .from(stockLots)
    .where(and(eq(stockLots.warehouseId, warehouseId), eq(stockLots.materialId, materialId), eq(stockLots.lote, lote)))
    .for('update');

  if (existente) {
    await tx.update(stockLots).set({ cantidad: String(Number(existente.cantidad) + cantidadAgregar) }).where(eq(stockLots.id, existente.id));
  } else {
    await tx.insert(stockLots).values({ tenantId, warehouseId, materialId, lote, fechaVencimiento, cantidad: String(cantidadAgregar) });
  }
}

/**
 * Consume `cantidad` de un lote. Si no se especifica uno, elige por FEFO
 * (el que vence primero) entre los que tengan saldo suficiente.
 *
 * ⚠️ SOLUCIÓN RÁPIDA: solo consume de UN lote — si ninguno alcanza por sí
 * solo la cantidad pedida, falla pidiendo que se divida el movimiento a
 * mano. Repartir automáticamente entre varios lotes queda para cuando haga
 * falta de verdad.
 */
async function consumirLote(tx: TxClient, warehouseId: string, materialId: string, loteEspecificado: string | null, cantidad: number): Promise<string> {
  if (loteEspecificado) {
    const [lote] = await tx
      .select()
      .from(stockLots)
      .where(and(eq(stockLots.warehouseId, warehouseId), eq(stockLots.materialId, materialId), eq(stockLots.lote, loteEspecificado)))
      .for('update');

    if (!lote || Number(lote.cantidad) < cantidad) {
      throw new KardexError(`El lote "${loteEspecificado}" no tiene existencia suficiente.`);
    }
    await tx.update(stockLots).set({ cantidad: String(Number(lote.cantidad) - cantidad) }).where(eq(stockLots.id, lote.id));
    return loteEspecificado;
  }

  const candidatos = await tx
    .select()
    .from(stockLots)
    .where(and(eq(stockLots.warehouseId, warehouseId), eq(stockLots.materialId, materialId), gt(stockLots.cantidad, '0')))
    .orderBy(sql`${stockLots.fechaVencimiento} asc nulls last`)
    .for('update');

  const conSaldoSuficiente = candidatos.find((l) => Number(l.cantidad) >= cantidad);
  if (!conSaldoSuficiente) {
    throw new KardexError('Ningún lote individual tiene existencia suficiente para esta salida. Divide el movimiento por lote manualmente.');
  }

  await tx.update(stockLots).set({ cantidad: String(Number(conSaldoSuficiente.cantidad) - cantidad) }).where(eq(stockLots.id, conSaldoSuficiente.id));
  return conSaldoSuficiente.lote;
}

/** Signo opuesto: lo usa `anularMovimiento` para revertir el efecto de cada línea. */
export function signoOpuesto(signo: 'ENTRADA' | 'SALIDA'): 'ENTRADA' | 'SALIDA' {
  return signo === 'ENTRADA' ? 'SALIDA' : 'ENTRADA';
}
