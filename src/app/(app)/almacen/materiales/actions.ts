'use server';

import { revalidatePath } from 'next/cache';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { importJobs, materials, uoms, warehouseStock } from '@/db/schema';
import { requirePermission } from '@/lib/permissions';
import { getCurrentTenant } from '@/lib/tenant';
import { buildDiff, writeAudit } from '@/lib/audit';
import { buildWhere } from '@/lib/query-builder';
import type { ColumnFilter } from '@/components/data-table/types';
import { resolverReferencias } from '@/lib/importacion/resolver-referencias';
import type { FilaExportada, FilaPreview, ResultadoImportacion } from '@/components/excel/import-dialog';
import {
  actualizarMaterialSchema,
  crearMaterialSchema,
  type ActualizarMaterialInput,
  type CrearMaterialInput,
  type MaterialFormValues,
} from '@/lib/validators/material';
import { MATERIAL_IMPORT_CAMPOS } from './import-campos';

export type AccionResultado = { ok: true; id?: string } | { ok: false; error: string };

function esViolacionDeUnicidad(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === '23505';
}

function datosDeFormulario(data: CrearMaterialInput) {
  return {
    codigo: data.codigo,
    nombre: data.nombre,
    descripcion: data.descripcion ?? null,
    tipo: data.tipo,
    uomId: data.uomId ?? null,
    categoria: data.categoria ?? null,
    critico: data.critico,
    manejaLote: data.manejaLote,
    manejaSerie: data.manejaSerie,
    activo: data.activo,
  };
}

export async function crearMaterial(input: CrearMaterialInput): Promise<AccionResultado> {
  const session = await requirePermission('almacen.materiales.gestionar');
  const parsed = crearMaterialSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' };

  const tenant = await getCurrentTenant();

  try {
    const [fila] = await db
      .insert(materials)
      .values({ tenantId: tenant.id, ...datosDeFormulario(parsed.data) })
      .returning({ id: materials.id });

    const id = fila?.id;
    if (!id) return { ok: false, error: 'No se pudo crear el material.' };

    await writeAudit({
      tenantId: tenant.id,
      entidad: 'almacen.materiales',
      entidadId: id,
      accion: 'INSERT',
      permiso: 'almacen.materiales.gestionar',
      userId: session.user.id,
      userEmail: session.user.email ?? null,
      diff: buildDiff(null, parsed.data),
    });

    revalidatePath('/almacen/materiales');
    return { ok: true, id };
  } catch (error) {
    if (esViolacionDeUnicidad(error)) return { ok: false, error: 'Ya existe un material con ese código.' };
    console.error('[crearMaterial]', error);
    return { ok: false, error: 'No se pudo crear el material.' };
  }
}

export async function actualizarMaterial(input: ActualizarMaterialInput): Promise<AccionResultado> {
  const session = await requirePermission('almacen.materiales.gestionar');
  const parsed = actualizarMaterialSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' };

  const data = parsed.data;
  const tenant = await getCurrentTenant();

  const [antes] = await db
    .select()
    .from(materials)
    .where(and(eq(materials.id, data.id), eq(materials.tenantId, tenant.id), isNull(materials.deletedAt)))
    .limit(1);
  if (!antes) return { ok: false, error: 'El material ya no existe.' };

  try {
    await db.update(materials).set(datosDeFormulario(data)).where(eq(materials.id, data.id));

    await writeAudit({
      tenantId: tenant.id,
      entidad: 'almacen.materiales',
      entidadId: data.id,
      accion: 'UPDATE',
      permiso: 'almacen.materiales.gestionar',
      userId: session.user.id,
      userEmail: session.user.email ?? null,
      diff: buildDiff(antes as unknown as Record<string, unknown>, parsed.data),
    });

    revalidatePath('/almacen/materiales');
    revalidatePath(`/almacen/materiales/${data.id}`);
    return { ok: true, id: data.id };
  } catch (error) {
    if (esViolacionDeUnicidad(error)) return { ok: false, error: 'Ya existe un material con ese código.' };
    console.error('[actualizarMaterial]', error);
    return { ok: false, error: 'No se pudo guardar el material.' };
  }
}

export async function eliminarMaterial(id: string): Promise<AccionResultado> {
  const session = await requirePermission('almacen.materiales.gestionar');
  const tenant = await getCurrentTenant();

  const tieneStock = await db
    .select({ id: warehouseStock.id })
    .from(warehouseStock)
    .where(eq(warehouseStock.materialId, id))
    .limit(1);
  if (tieneStock.length > 0) {
    return { ok: false, error: 'No puedes eliminar un material con existencias registradas en algún almacén.' };
  }

  const [fila] = await db
    .update(materials)
    .set({ deletedAt: new Date(), activo: false })
    .where(and(eq(materials.id, id), eq(materials.tenantId, tenant.id), isNull(materials.deletedAt)))
    .returning({ id: materials.id, nombre: materials.nombre });

  if (!fila) return { ok: false, error: 'El material ya no existe.' };

  await writeAudit({
    tenantId: tenant.id,
    entidad: 'almacen.materiales',
    entidadId: fila.id,
    accion: 'DELETE',
    nivel: 'CRITICO',
    permiso: 'almacen.materiales.gestionar',
    userId: session.user.id,
    userEmail: session.user.email ?? null,
    diff: { eliminado: { antes: fila.nombre, despues: null } },
  });

  revalidatePath('/almacen/materiales');
  return { ok: true };
}

export async function obtenerMaterialParaEditar(id: string): Promise<MaterialFormValues | null> {
  await requirePermission('almacen.materiales.ver');
  const tenant = await getCurrentTenant();

  const [fila] = await db
    .select()
    .from(materials)
    .where(and(eq(materials.id, id), eq(materials.tenantId, tenant.id), isNull(materials.deletedAt)))
    .limit(1);
  if (!fila) return null;

  return {
    id: fila.id,
    codigo: fila.codigo,
    nombre: fila.nombre,
    descripcion: fila.descripcion ?? undefined,
    tipo: fila.tipo,
    uomId: fila.uomId ?? undefined,
    categoria: fila.categoria ?? undefined,
    critico: fila.critico,
    manejaLote: fila.manejaLote,
    manejaSerie: fila.manejaSerie,
    activo: fila.activo,
  };
}

export async function obtenerOpcionesMaterial(): Promise<{ uoms: { value: string; label: string }[] }> {
  await requirePermission('almacen.materiales.ver');
  const tenant = await getCurrentTenant();

  const filas = await db
    .select({ value: uoms.id, label: uoms.nombre })
    .from(uoms)
    .where(and(eq(uoms.tenantId, tenant.id), eq(uoms.activo, true), isNull(uoms.deletedAt)))
    .orderBy(uoms.nombre);

  return { uoms: filas };
}

/* -------------------------------------------------------------------------- */
/* EXCEL — IMPORTAR / EXPORTAR / PLANTILLA                                    */
/* -------------------------------------------------------------------------- */

export async function exportarMateriales(filtros: ColumnFilter[], search: string): Promise<{ headers: string[]; rows: FilaExportada[] }> {
  await requirePermission('almacen.materiales.exportar');
  const tenant = await getCurrentTenant();
  const { uoms: opcionesUom } = await obtenerOpcionesMaterial();
  const opciones: Record<string, { value: string; label: string }[]> = { uomId: opcionesUom };

  const COLUMNAS = { codigo: materials.codigo, nombre: materials.nombre, tipo: materials.tipo, categoria: materials.categoria, critico: materials.critico, activo: materials.activo };
  const where = and(
    eq(materials.tenantId, tenant.id),
    isNull(materials.deletedAt),
    buildWhere(COLUMNAS, filtros, search, ['codigo', 'nombre', 'categoria']),
  );

  const filas = await db.select().from(materials).where(where).orderBy(materials.nombre);

  const headers = MATERIAL_IMPORT_CAMPOS.map((c) => c.label);
  const rows: FilaExportada[] = (filas as unknown as Record<string, unknown>[]).map((fila) =>
    MATERIAL_IMPORT_CAMPOS.map((campo) => {
      const v = fila[campo.name];
      if (campo.tipo === 'referencia') return (opciones[campo.name] ?? []).find((o) => o.value === v)?.label ?? '';
      if (campo.tipo === 'enum') return campo.opciones?.find((o) => o.value === v)?.label ?? '';
      if (campo.tipo === 'booleano') return v ? 'Sí' : 'No';
      if (v === null || v === undefined) return '';
      return typeof v === 'number' ? v : String(v);
    }),
  );

  return { headers, rows };
}

async function validarFilaImportacionMaterial(
  cruda: Record<string, unknown>,
  opciones: Record<string, { value: string; label: string }[]>,
): Promise<{ ok: true; datos: CrearMaterialInput } | { ok: false; codigo: string; nombre: string; error: string }> {
  const { valores, errores: erroresReferencia } = resolverReferencias(MATERIAL_IMPORT_CAMPOS, opciones, cruda);
  const codigo = String(valores.codigo ?? '').trim();
  const nombre = String(valores.nombre ?? '').trim();

  if (erroresReferencia.length > 0) {
    return { ok: false, codigo, nombre, error: erroresReferencia.join(' ') };
  }

  const parsed = crearMaterialSchema.safeParse(valores);
  if (!parsed.success) {
    return { ok: false, codigo, nombre, error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' };
  }

  return { ok: true, datos: parsed.data };
}

export async function previsualizarImportacionMateriales(filasCrudas: Record<string, unknown>[]): Promise<FilaPreview[]> {
  await requirePermission('almacen.materiales.importar');
  const tenant = await getCurrentTenant();
  const { uoms: opcionesUom } = await obtenerOpcionesMaterial();
  const opciones: Record<string, { value: string; label: string }[]> = { uomId: opcionesUom };
  const resultado: FilaPreview[] = [];

  for (let i = 0; i < filasCrudas.length; i++) {
    const numeroFila = i + 2;
    const validacion = await validarFilaImportacionMaterial(filasCrudas[i]!, opciones);
    if (!validacion.ok) {
      resultado.push({ fila: numeroFila, estado: 'ERROR', codigo: validacion.codigo, nombre: validacion.nombre, error: validacion.error });
      continue;
    }

    const [existente] = await db
      .select({ id: materials.id })
      .from(materials)
      .where(and(eq(materials.tenantId, tenant.id), eq(materials.codigo, validacion.datos.codigo), isNull(materials.deletedAt)))
      .limit(1);

    resultado.push({ fila: numeroFila, estado: existente ? 'ACTUALIZAR' : 'CREAR', codigo: validacion.datos.codigo, nombre: validacion.datos.nombre });
  }

  return resultado;
}

export async function importarMaterialesFilas(filasCrudas: Record<string, unknown>[], archivoNombre: string): Promise<ResultadoImportacion> {
  const session = await requirePermission('almacen.materiales.importar');
  const tenant = await getCurrentTenant();
  const { uoms: opcionesUom } = await obtenerOpcionesMaterial();
  const opciones: Record<string, { value: string; label: string }[]> = { uomId: opcionesUom };

  const [job] = await db
    .insert(importJobs)
    .values({ tenantId: tenant.id, catalogo: 'materiales', archivoNombre, estado: 'PROCESANDO', totalFilas: filasCrudas.length, userId: session.user.id })
    .returning({ id: importJobs.id });
  if (!job) return { ok: false, error: 'No se pudo iniciar la importación.' };

  const errores: { fila: number; error: string }[] = [];
  let filasOk = 0;

  for (let i = 0; i < filasCrudas.length; i++) {
    const numeroFila = i + 2;
    const validacion = await validarFilaImportacionMaterial(filasCrudas[i]!, opciones);
    if (!validacion.ok) {
      errores.push({ fila: numeroFila, error: validacion.error });
      continue;
    }

    try {
      const [existente] = await db
        .select({ id: materials.id })
        .from(materials)
        .where(and(eq(materials.tenantId, tenant.id), eq(materials.codigo, validacion.datos.codigo), isNull(materials.deletedAt)))
        .limit(1);

      if (existente) {
        await db.update(materials).set(datosDeFormulario(validacion.datos)).where(eq(materials.id, existente.id));
      } else {
        await db.insert(materials).values({ tenantId: tenant.id, ...datosDeFormulario(validacion.datos) });
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
    entidad: 'almacen.materiales',
    accion: 'INSERT',
    nivel: 'CRITICO',
    permiso: 'almacen.materiales.importar',
    userId: session.user.id,
    userEmail: session.user.email ?? null,
    diff: { importacion: { antes: null, despues: `${filasOk}/${filasCrudas.length} filas desde ${archivoNombre}` } },
  });

  revalidatePath('/almacen/materiales');
  return { ok: true, jobId: job.id, total: filasCrudas.length, filasOk, filasError: errores.length, errores };
}
