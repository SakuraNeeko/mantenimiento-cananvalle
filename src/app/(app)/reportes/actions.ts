'use server';

import { and, eq, gte, lte } from 'drizzle-orm';
import { db } from '@/db';
import { costCenters, maintenanceTypes, periodicBalance, workOrders } from '@/db/schema';
import { requirePermission } from '@/lib/permissions';
import { getCurrentTenant } from '@/lib/tenant';
import {
  calcularBacklog,
  calcularCostoPorActivo,
  calcularCumplimientoPlan,
  calcularCumplimientoSLA,
  calcularDisponibilidad,
  calcularIndicePreventivoCorrectivo,
  calcularMTBF,
  calcularMTTR,
  calcularRotacionInventario,
  paretoPorCausaFalla,
  paretoPorCosto,
  type RangoFechas,
} from '@/lib/kpis/calculos';

export type AccionResultado = { ok: true } | { ok: false; error: string };

export async function obtenerDashboard(desde: string, hasta: string) {
  await requirePermission('reportes.dashboard.ver');
  const tenant = await getCurrentTenant();
  const rango: RangoFechas = { desde: new Date(desde), hasta: new Date(hasta) };

  const [mtbf, mttr, cumplimientoPlan, preventivoCorrectivo, backlog, costoPorActivo, rotacionInventario, cumplimientoSla, paretoCausas, paretoCostos] = await Promise.all([
    calcularMTBF(tenant.id, rango),
    calcularMTTR(tenant.id, rango),
    calcularCumplimientoPlan(tenant.id, rango),
    calcularIndicePreventivoCorrectivo(tenant.id, rango),
    calcularBacklog(tenant.id),
    calcularCostoPorActivo(tenant.id, rango),
    calcularRotacionInventario(tenant.id, rango),
    calcularCumplimientoSLA(tenant.id, rango),
    paretoPorCausaFalla(tenant.id, rango),
    paretoPorCosto(tenant.id, rango),
  ]);

  const disponibilidad = calcularDisponibilidad(mtbf.mtbfHoras, mttr.mttrHoras);

  return { mtbf, mttr, disponibilidad, cumplimientoPlan, preventivoCorrectivo, backlog, costoPorActivo, rotacionInventario, cumplimientoSla, paretoCausas, paretoCostos: paretoCostos.slice(0, 15) };
}

function limitesPeriodo(tipo: 'MES' | 'TRIMESTRE' | 'ANIO', anio: number, numero: number | null): { desde: Date; hasta: Date } {
  if (tipo === 'ANIO') return { desde: new Date(Date.UTC(anio, 0, 1)), hasta: new Date(Date.UTC(anio + 1, 0, 1)) };
  if (tipo === 'TRIMESTRE') {
    const mesInicio = ((numero ?? 1) - 1) * 3;
    return { desde: new Date(Date.UTC(anio, mesInicio, 1)), hasta: new Date(Date.UTC(anio, mesInicio + 3, 1)) };
  }
  const mes = (numero ?? 1) - 1;
  return { desde: new Date(Date.UTC(anio, mes, 1)), hasta: new Date(Date.UTC(anio, mes + 1, 1)) };
}

/** Genera y guarda el balance de un periodo — inmutable: si ya existe, hay que verlo, no recalcularlo encima. */
export async function generarBalance(tipo: 'MES' | 'TRIMESTRE' | 'ANIO', anio: number, numero: number | null): Promise<AccionResultado> {
  const session = await requirePermission('historia.balance.calcular');
  const tenant = await getCurrentTenant();

  const [existente] = await db
    .select({ id: periodicBalance.id })
    .from(periodicBalance)
    .where(and(eq(periodicBalance.tenantId, tenant.id), eq(periodicBalance.tipo, tipo), eq(periodicBalance.anio, anio), eq(periodicBalance.numero, numero ?? 0)))
    .limit(1);
  if (existente) return { ok: false, error: 'Ya existe un balance para este periodo. Consúltalo en el listado.' };

  const { desde, hasta } = limitesPeriodo(tipo, anio, numero);
  const rango: RangoFechas = { desde, hasta };
  const condicionPeriodo = and(eq(workOrders.tenantId, tenant.id), eq(workOrders.estado, 'CERRADA'), gte(workOrders.fechaFinReal, desde), lte(workOrders.fechaFinReal, hasta));

  const [ordenesCerradas, mtbf, mttr, cumplimientoPlan, preventivoCorrectivo, cumplimientoSla, porCentroCosto, porTipoMantenimiento, porActivo] = await Promise.all([
    db
      .select({ costoManoObra: workOrders.costoManoObra, costoMateriales: workOrders.costoMateriales, costoTerceros: workOrders.costoTerceros, costoOtros: workOrders.costoOtros, costoTotal: workOrders.costoTotal, origen: workOrders.origen, maintenanceTypeId: workOrders.maintenanceTypeId })
      .from(workOrders)
      .where(condicionPeriodo),
    calcularMTBF(tenant.id, rango),
    calcularMTTR(tenant.id, rango),
    calcularCumplimientoPlan(tenant.id, rango),
    calcularIndicePreventivoCorrectivo(tenant.id, rango),
    calcularCumplimientoSLA(tenant.id, rango),
    db
      .select({ nombre: costCenters.nombre, costoTotal: workOrders.costoTotal })
      .from(workOrders)
      .leftJoin(costCenters, eq(costCenters.id, workOrders.costCenterId))
      .where(condicionPeriodo),
    db
      .select({ nombre: maintenanceTypes.nombre, costoTotal: workOrders.costoTotal })
      .from(workOrders)
      .leftJoin(maintenanceTypes, eq(maintenanceTypes.id, workOrders.maintenanceTypeId))
      .where(condicionPeriodo),
    calcularCostoPorActivo(tenant.id, rango, 1000),
  ]);

  const costoManoObra = ordenesCerradas.reduce((s, o) => s + Number(o.costoManoObra), 0);
  const costoMateriales = ordenesCerradas.reduce((s, o) => s + Number(o.costoMateriales), 0);
  const costoTerceros = ordenesCerradas.reduce((s, o) => s + Number(o.costoTerceros), 0);
  const costoOtros = ordenesCerradas.reduce((s, o) => s + Number(o.costoOtros), 0);
  const costoTotal = ordenesCerradas.reduce((s, o) => s + Number(o.costoTotal), 0);
  const otPreventivas = ordenesCerradas.filter((o) => o.origen === 'PLAN').length;
  const otCorrectivas = ordenesCerradas.filter((o) => o.origen !== 'PLAN').length;

  const sumarPorNombre = (filas: { nombre: string | null; costoTotal: string }[]) => {
    const mapa = new Map<string, number>();
    for (const f of filas) {
      const clave = f.nombre ?? 'Sin especificar';
      mapa.set(clave, (mapa.get(clave) ?? 0) + Number(f.costoTotal));
    }
    return Object.fromEntries(mapa);
  };

  const disponibilidad = calcularDisponibilidad(mtbf.mtbfHoras, mttr.mttrHoras);

  await db.insert(periodicBalance).values({
    tenantId: tenant.id,
    tipo,
    anio,
    numero: numero ?? 0,
    fechaInicio: desde,
    fechaFin: hasta,
    costoManoObra: String(costoManoObra),
    costoMateriales: String(costoMateriales),
    costoTerceros: String(costoTerceros),
    costoOtros: String(costoOtros),
    costoTotal: String(costoTotal),
    otCerradas: ordenesCerradas.length,
    otPreventivas,
    otCorrectivas,
    cumplimientoPlan: cumplimientoPlan.cumplimiento !== null ? String(cumplimientoPlan.cumplimiento) : null,
    indicePreventivo: preventivoCorrectivo.indice !== null ? String(preventivoCorrectivo.indice) : null,
    mtbfHoras: mtbf.mtbfHoras !== null ? String(mtbf.mtbfHoras) : null,
    mttrHoras: mttr.mttrHoras !== null ? String(mttr.mttrHoras) : null,
    disponibilidad: disponibilidad !== null ? String(disponibilidad) : null,
    cumplimientoSla: cumplimientoSla.cumplimiento !== null ? String(cumplimientoSla.cumplimiento) : null,
    desglose: { porCentroCosto: sumarPorNombre(porCentroCosto), porTipoMantenimiento: sumarPorNombre(porTipoMantenimiento), porActivo: porActivo.map((a) => ({ assetCodigo: a.assetCodigo, assetNombre: a.assetNombre, costoTotal: a.costoTotal })) },
    calculadoBy: session.user.id,
  });

  return { ok: true };
}

export async function obtenerBalances() {
  await requirePermission('historia.ver');
  const tenant = await getCurrentTenant();
  return db.select().from(periodicBalance).where(eq(periodicBalance.tenantId, tenant.id)).orderBy(periodicBalance.fechaInicio);
}
