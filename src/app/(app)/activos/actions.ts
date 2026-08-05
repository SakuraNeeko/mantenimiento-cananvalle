'use server';

import { revalidatePath } from 'next/cache';
import { and, eq, isNull, ne, sql } from 'drizzle-orm';
import { db, dbTx } from '@/db';
import { assets, assetClasses, assetStatusHistory, costCenters, importJobs, locations, parties, responsibleCenters, contracts } from '@/db/schema';
import { requirePermission } from '@/lib/permissions';
import { getCurrentTenant } from '@/lib/tenant';
import { buildDiff, writeAudit } from '@/lib/audit';
import { buildWhere } from '@/lib/query-builder';
import type { ColumnFilter } from '@/components/data-table/types';
import { resolverReferencias } from '@/lib/importacion/resolver-referencias';
import type { FilaExportada, FilaPreview, ResultadoImportacion } from '@/components/excel/import-dialog';
import { ACTIVO_IMPORT_CAMPOS } from './import-campos';
import {
  actualizarActivoSchema,
  crearActivoSchema,
  ESTADO_LABELS,
  type ActualizarActivoInput,
  type ActivoFormValues,
  type CrearActivoInput,
} from '@/lib/validators/activo';

export type AccionResultado = { ok: true; id?: string } | { ok: false; error: string };

function esViolacionDeUnicidad(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === '23505';
}

/** Aplana los campos del formulario a columnas de `assets`; '' → null. */
function datosDeFormulario(data: CrearActivoInput) {
  return {
    codigo: data.codigo,
    nombre: data.nombre,
    claseId: data.claseId,
    criticidad: data.criticidad,
    parentId: data.parentId ?? null,
    locationId: data.locationId ?? null,
    costCenterId: data.costCenterId ?? null,
    responsibleCenterId: data.responsibleCenterId ?? null,
    fabricante: data.fabricante ?? null,
    modelo: data.modelo ?? null,
    serie: data.serie ?? null,
    anio: data.anio ?? null,
    fechaCompra: data.fechaCompra ?? null,
    valorCompra: data.valorCompra ?? null,
    valorActual: data.valorActual ?? null,
    vidaUtilMeses: data.vidaUtilMeses ?? null,
    garantiaFin: data.garantiaFin ?? null,
    diasAlertaGarantia: data.diasAlertaGarantia ?? 30,
    partyId: data.partyId ?? null,
    contractId: data.contractId ?? null,
    descripcion: data.descripcion ?? null,
    activo: data.activo,
  };
}

export async function crearActivo(input: CrearActivoInput): Promise<AccionResultado> {
  const session = await requirePermission('activos.crear');
  const parsed = crearActivoSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' };

  const tenant = await getCurrentTenant();

  try {
    const [fila] = await db
      .insert(assets)
      .values({ tenantId: tenant.id, ...datosDeFormulario(parsed.data) })
      .returning({ id: assets.id });

    const id = fila?.id;
    if (!id) return { ok: false, error: 'No se pudo crear el activo.' };

    await writeAudit({
      tenantId: tenant.id,
      entidad: 'activos',
      entidadId: id,
      accion: 'INSERT',
      permiso: 'activos.crear',
      userId: session.user.id,
      userEmail: session.user.email ?? null,
      diff: buildDiff(null, parsed.data),
    });

    revalidatePath('/activos');
    return { ok: true, id };
  } catch (error) {
    if (esViolacionDeUnicidad(error)) return { ok: false, error: 'Ya existe un activo con ese código.' };
    console.error('[crearActivo]', error);
    return { ok: false, error: 'No se pudo crear el activo.' };
  }
}

export async function actualizarActivo(input: ActualizarActivoInput): Promise<AccionResultado> {
  const session = await requirePermission('activos.editar');
  const parsed = actualizarActivoSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' };

  const data = parsed.data;
  const tenant = await getCurrentTenant();

  if (data.parentId === data.id) {
    return { ok: false, error: 'Un activo no puede ser su propio componente padre.' };
  }

  const [antes] = await db
    .select()
    .from(assets)
    .where(and(eq(assets.id, data.id), eq(assets.tenantId, tenant.id), isNull(assets.deletedAt)))
    .limit(1);
  if (!antes) return { ok: false, error: 'El activo ya no existe.' };

  try {
    await db
      .update(assets)
      .set(datosDeFormulario(data))
      .where(eq(assets.id, data.id));

    await writeAudit({
      tenantId: tenant.id,
      entidad: 'activos',
      entidadId: data.id,
      accion: 'UPDATE',
      permiso: 'activos.editar',
      userId: session.user.id,
      userEmail: session.user.email ?? null,
      diff: buildDiff(antes as unknown as Record<string, unknown>, parsed.data),
    });

    revalidatePath('/activos');
    revalidatePath(`/activos/${data.id}`);
    return { ok: true, id: data.id };
  } catch (error) {
    if (esViolacionDeUnicidad(error)) return { ok: false, error: 'Ya existe un activo con ese código.' };
    console.error('[actualizarActivo]', error);
    return { ok: false, error: 'No se pudo guardar el activo.' };
  }
}

export async function eliminarActivo(id: string): Promise<AccionResultado> {
  const session = await requirePermission('activos.eliminar');
  const tenant = await getCurrentTenant();

  const [conteo] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(assets)
    .where(and(eq(assets.parentId, id), isNull(assets.deletedAt)));
  if ((conteo?.n ?? 0) > 0) {
    return { ok: false, error: 'No puedes eliminar un activo que tiene componentes. Muévelos o elimínalos primero.' };
  }

  const [fila] = await db
    .update(assets)
    .set({ deletedAt: new Date(), activo: false })
    .where(and(eq(assets.id, id), eq(assets.tenantId, tenant.id), isNull(assets.deletedAt)))
    .returning({ id: assets.id, nombre: assets.nombre });

  if (!fila) return { ok: false, error: 'El activo ya no existe.' };

  await writeAudit({
    tenantId: tenant.id,
    entidad: 'activos',
    entidadId: fila.id,
    accion: 'DELETE',
    nivel: 'CRITICO',
    permiso: 'activos.eliminar',
    userId: session.user.id,
    userEmail: session.user.email ?? null,
    diff: { eliminado: { antes: fila.nombre, despues: null } },
  });

  revalidatePath('/activos');
  return { ok: true };
}

/** Cambia el estado operativo y lo registra en `asset_status_history` (hoja de vida). */
export async function cambiarEstadoActivo(id: string, nuevoEstado: string, motivo?: string): Promise<AccionResultado> {
  const session = await requirePermission('activos.editar');
  if (!(nuevoEstado in ESTADO_LABELS)) return { ok: false, error: 'Estado inválido.' };
  const tenant = await getCurrentTenant();

  const [antes] = await db
    .select({ estado: assets.estado })
    .from(assets)
    .where(and(eq(assets.id, id), eq(assets.tenantId, tenant.id), isNull(assets.deletedAt)))
    .limit(1);
  if (!antes) return { ok: false, error: 'El activo ya no existe.' };

  if (antes.estado === nuevoEstado) return { ok: true, id };

  await dbTx.transaction(async (tx) => {
    await tx
      .update(assets)
      .set({ estado: nuevoEstado as typeof assets.$inferSelect.estado })
      .where(eq(assets.id, id));

    await tx.insert(assetStatusHistory).values({
      tenantId: tenant.id,
      assetId: id,
      estadoAnterior: antes.estado,
      estadoNuevo: nuevoEstado as typeof assets.$inferSelect.estado,
      motivo: motivo ?? null,
      createdBy: session.user.id,
    });
  });

  await writeAudit({
    tenantId: tenant.id,
    entidad: 'activos',
    entidadId: id,
    accion: 'UPDATE',
    permiso: 'activos.editar',
    userId: session.user.id,
    userEmail: session.user.email ?? null,
    diff: { estado: { antes: antes.estado, despues: nuevoEstado } },
  });

  revalidatePath(`/activos/${id}`);
  revalidatePath('/activos');
  return { ok: true, id };
}

export async function obtenerActivoParaEditar(id: string): Promise<ActivoFormValues | null> {
  await requirePermission('activos.ver');
  const tenant = await getCurrentTenant();

  const [fila] = await db
    .select()
    .from(assets)
    .where(and(eq(assets.id, id), eq(assets.tenantId, tenant.id), isNull(assets.deletedAt)))
    .limit(1);
  if (!fila) return null;

  return {
    id: fila.id,
    codigo: fila.codigo,
    nombre: fila.nombre,
    claseId: fila.claseId,
    criticidad: fila.criticidad,
    parentId: fila.parentId ?? undefined,
    locationId: fila.locationId ?? undefined,
    costCenterId: fila.costCenterId ?? undefined,
    responsibleCenterId: fila.responsibleCenterId ?? undefined,
    fabricante: fila.fabricante ?? undefined,
    modelo: fila.modelo ?? undefined,
    serie: fila.serie ?? undefined,
    anio: fila.anio ?? undefined,
    fechaCompra: fila.fechaCompra ?? undefined,
    valorCompra: fila.valorCompra ?? undefined,
    valorActual: fila.valorActual ?? undefined,
    vidaUtilMeses: fila.vidaUtilMeses ?? undefined,
    garantiaFin: fila.garantiaFin ?? undefined,
    diasAlertaGarantia: fila.diasAlertaGarantia,
    partyId: fila.partyId ?? undefined,
    contractId: fila.contractId ?? undefined,
    descripcion: fila.descripcion ?? undefined,
    activo: fila.activo,
  };
}

export type OpcionesActivo = {
  clases: { value: string; label: string }[];
  locations: { value: string; label: string }[];
  costCenters: { value: string; label: string }[];
  responsibleCenters: { value: string; label: string }[];
  parties: { value: string; label: string }[];
  contracts: { value: string; label: string }[];
  padres: { value: string; label: string }[];
};

/** Opciones para los selectores de referencia del formulario. `excluirId` quita al propio activo de la lista de padres. */
export async function obtenerOpcionesActivo(excluirId?: string): Promise<OpcionesActivo> {
  await requirePermission('activos.ver');
  const tenant = await getCurrentTenant();

  const [clases, locs, ccs, rcs, prts, ctrs, padres] = await Promise.all([
    db.select({ value: assetClasses.id, label: assetClasses.nombre }).from(assetClasses).where(and(eq(assetClasses.tenantId, tenant.id), eq(assetClasses.activo, true), isNull(assetClasses.deletedAt))).orderBy(assetClasses.nombre),
    db.select({ value: locations.id, label: locations.nombre }).from(locations).where(and(eq(locations.tenantId, tenant.id), eq(locations.activo, true), isNull(locations.deletedAt))).orderBy(locations.nombre),
    db.select({ value: costCenters.id, label: costCenters.nombre }).from(costCenters).where(and(eq(costCenters.tenantId, tenant.id), eq(costCenters.activo, true), isNull(costCenters.deletedAt))).orderBy(costCenters.nombre),
    db.select({ value: responsibleCenters.id, label: responsibleCenters.nombre }).from(responsibleCenters).where(and(eq(responsibleCenters.tenantId, tenant.id), eq(responsibleCenters.activo, true), isNull(responsibleCenters.deletedAt))).orderBy(responsibleCenters.nombre),
    db.select({ value: parties.id, label: parties.nombre }).from(parties).where(and(eq(parties.tenantId, tenant.id), eq(parties.activo, true), isNull(parties.deletedAt))).orderBy(parties.nombre),
    db.select({ value: contracts.id, label: contracts.nombre }).from(contracts).where(and(eq(contracts.tenantId, tenant.id), eq(contracts.activo, true), isNull(contracts.deletedAt))).orderBy(contracts.nombre),
    db
      .select({ value: assets.id, label: sql<string>`${assets.codigo} || ' — ' || ${assets.nombre}` })
      .from(assets)
      .where(
        and(
          eq(assets.tenantId, tenant.id),
          isNull(assets.deletedAt),
          excluirId ? ne(assets.id, excluirId) : undefined,
        ),
      )
      .orderBy(assets.nombre),
  ]);

  return {
    clases: clases.map((c) => ({ value: c.value, label: c.label })),
    locations: locs.map((l) => ({ value: l.value, label: l.label })),
    costCenters: ccs.map((c) => ({ value: c.value, label: c.label })),
    responsibleCenters: rcs.map((r) => ({ value: r.value, label: r.label })),
    parties: prts.map((p) => ({ value: p.value, label: p.label })),
    contracts: ctrs.map((c) => ({ value: c.value, label: c.label })),
    padres: padres.map((p) => ({ value: p.value, label: p.label })),
  };
}

/* -------------------------------------------------------------------------- */
/* EXCEL — IMPORTAR / EXPORTAR / PLANTILLA                                    */
/* -------------------------------------------------------------------------- */

async function opcionesParaResolver(): Promise<Record<string, { value: string; label: string }[]>> {
  const opciones = await obtenerOpcionesActivo();
  return {
    claseId: opciones.clases,
    locationId: opciones.locations,
    costCenterId: opciones.costCenters,
    responsibleCenterId: opciones.responsibleCenters,
    partyId: opciones.parties,
    contractId: opciones.contracts,
  };
}

export async function exportarActivos(filtros: ColumnFilter[], search: string): Promise<{ headers: string[]; rows: FilaExportada[] }> {
  await requirePermission('activos.exportar');
  const tenant = await getCurrentTenant();
  const opciones = await opcionesParaResolver();

  const COLUMNAS = { codigo: assets.codigo, nombre: assets.nombre, clase: assetClasses.nombre, estado: assets.estado, criticidad: assets.criticidad, activo: assets.activo };
  const where = and(
    eq(assets.tenantId, tenant.id),
    isNull(assets.deletedAt),
    buildWhere(COLUMNAS, filtros, search, ['codigo', 'nombre', 'fabricante', 'modelo', 'serie']),
  );

  const filas = await db
    .select()
    .from(assets)
    .leftJoin(assetClasses, eq(assetClasses.id, assets.claseId))
    .where(where)
    .orderBy(assets.nombre);

  const headers = ACTIVO_IMPORT_CAMPOS.map((c) => c.label);
  const rows: FilaExportada[] = filas.map(({ assets: fila }) =>
    ACTIVO_IMPORT_CAMPOS.map((campo) => {
      const v = (fila as unknown as Record<string, unknown>)[campo.name];
      if (campo.tipo === 'referencia') return (opciones[campo.name] ?? []).find((o) => o.value === v)?.label ?? '';
      if (campo.tipo === 'booleano') return v ? 'Sí' : 'No';
      if (v === null || v === undefined) return '';
      if (campo.tipo === 'fecha') {
        const fecha = v instanceof Date ? v : new Date(String(v));
        if (!Number.isNaN(fecha.getTime())) return fecha;
      }
      return typeof v === 'number' ? v : String(v);
    }),
  );

  return { headers, rows };
}

/** Valida y resuelve una fila de import sin escribir nada; determina si crearía o actualizaría. */
async function validarFilaImportacion(
  cruda: Record<string, unknown>,
  opciones: Record<string, { value: string; label: string }[]>,
): Promise<{ ok: true; datos: CrearActivoInput } | { ok: false; codigo: string; nombre: string; error: string }> {
  const { valores, errores: erroresReferencia } = resolverReferencias(ACTIVO_IMPORT_CAMPOS, opciones, cruda);
  const codigo = String(valores.codigo ?? '').trim();
  const nombre = String(valores.nombre ?? '').trim();

  if (erroresReferencia.length > 0) {
    return { ok: false, codigo, nombre, error: erroresReferencia.join(' ') };
  }

  const parsed = crearActivoSchema.safeParse(valores);
  if (!parsed.success) {
    return { ok: false, codigo, nombre, error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' };
  }

  return { ok: true, datos: parsed.data };
}

export async function previsualizarImportacionActivos(filasCrudas: Record<string, unknown>[]): Promise<FilaPreview[]> {
  await requirePermission('activos.importar');
  const tenant = await getCurrentTenant();
  const opciones = await opcionesParaResolver();
  const resultado: FilaPreview[] = [];

  for (let i = 0; i < filasCrudas.length; i++) {
    const numeroFila = i + 2;
    const validacion = await validarFilaImportacion(filasCrudas[i]!, opciones);
    if (!validacion.ok) {
      resultado.push({ fila: numeroFila, estado: 'ERROR', codigo: validacion.codigo, nombre: validacion.nombre, error: validacion.error });
      continue;
    }

    const [existente] = await db
      .select({ id: assets.id })
      .from(assets)
      .where(and(eq(assets.tenantId, tenant.id), eq(assets.codigo, validacion.datos.codigo), isNull(assets.deletedAt)))
      .limit(1);

    resultado.push({ fila: numeroFila, estado: existente ? 'ACTUALIZAR' : 'CREAR', codigo: validacion.datos.codigo, nombre: validacion.datos.nombre });
  }

  return resultado;
}

export async function importarActivosFilas(filasCrudas: Record<string, unknown>[], archivoNombre: string): Promise<ResultadoImportacion> {
  const session = await requirePermission('activos.importar');
  const tenant = await getCurrentTenant();
  const opciones = await opcionesParaResolver();

  const [job] = await db
    .insert(importJobs)
    .values({ tenantId: tenant.id, catalogo: 'activos', archivoNombre, estado: 'PROCESANDO', totalFilas: filasCrudas.length, userId: session.user.id })
    .returning({ id: importJobs.id });
  if (!job) return { ok: false, error: 'No se pudo iniciar la importación.' };

  const errores: { fila: number; error: string }[] = [];
  let filasOk = 0;

  for (let i = 0; i < filasCrudas.length; i++) {
    const numeroFila = i + 2;
    const validacion = await validarFilaImportacion(filasCrudas[i]!, opciones);
    if (!validacion.ok) {
      errores.push({ fila: numeroFila, error: validacion.error });
      continue;
    }

    try {
      const [existente] = await db
        .select({ id: assets.id })
        .from(assets)
        .where(and(eq(assets.tenantId, tenant.id), eq(assets.codigo, validacion.datos.codigo), isNull(assets.deletedAt)))
        .limit(1);

      if (existente) {
        await db.update(assets).set(datosDeFormulario(validacion.datos)).where(eq(assets.id, existente.id));
      } else {
        await db.insert(assets).values({ tenantId: tenant.id, ...datosDeFormulario(validacion.datos) });
      }
      filasOk++;
    } catch (error) {
      errores.push({ fila: numeroFila, error: esViolacionDeUnicidad(error) ? 'Código duplicado.' : 'No se pudo guardar la fila.' });
    }
  }

  const estado = errores.length === 0 ? 'COMPLETADO' : filasOk === 0 ? 'FALLIDO' : 'CON_ERRORES';
  await db
    .update(importJobs)
    .set({ estado, filasOk, filasError: errores.length, errores, terminadoAt: new Date() })
    .where(eq(importJobs.id, job.id));

  await writeAudit({
    tenantId: tenant.id,
    entidad: 'activos',
    accion: 'INSERT',
    nivel: 'CRITICO',
    permiso: 'activos.importar',
    userId: session.user.id,
    userEmail: session.user.email ?? null,
    diff: { importacion: { antes: null, despues: `${filasOk}/${filasCrudas.length} filas desde ${archivoNombre}` } },
  });

  revalidatePath('/activos');
  return { ok: true, jobId: job.id, total: filasCrudas.length, filasOk, filasError: errores.length, errores };
}
