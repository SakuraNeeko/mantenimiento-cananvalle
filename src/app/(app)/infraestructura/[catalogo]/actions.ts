'use server';

import { revalidatePath } from 'next/cache';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { importJobs } from '@/db/schema';
import { requirePermission } from '@/lib/permissions';
import { getCurrentTenant } from '@/lib/tenant';
import { buildDiff, writeAudit } from '@/lib/audit';
import { buildWhere } from '@/lib/query-builder';
import type { ColumnFilter } from '@/components/data-table/types';
import { getCatalogo, type CatalogoDef } from '@/lib/catalogs/registry';
import { buildCatalogoSchema, type ValoresDinamicos } from '@/lib/catalogs/validators';
import { columnasBase, columnasDe, esViolacionDeUnicidad } from '@/lib/catalogs/db-helpers';

/**
 * Server Actions genéricas: una sola implementación para los ~28 catálogos
 * planos del registro (los 3 jerárquicos comparten estas mismas acciones,
 * solo cambia cómo se renderiza el listado — árbol en vez de tabla).
 */

export type AccionResultado = { ok: true; id?: string } | { ok: false; error: string };

function requireCatalogo(slug: string): CatalogoDef {
  const def = getCatalogo(slug);
  if (!def) throw new Error(`Catálogo desconocido: ${slug}`);
  return def;
}

/** '' → null; solo pasa columnas que existen de verdad en la tabla. */
function prepararValores(def: CatalogoDef, valores: ValoresDinamicos): Record<string, unknown> {
  const cols = columnasDe(def);
  const salida: Record<string, unknown> = {};
  for (const campo of def.campos) {
    if (!(campo.name in cols)) continue;
    const v = valores[campo.name];
    salida[campo.name] = v === '' || v === undefined ? null : v;
  }
  return salida;
}

export async function crearRegistro(slug: string, valoresCrudos: ValoresDinamicos): Promise<AccionResultado> {
  const def = requireCatalogo(slug);
  const session = await requirePermission('infra.catalogos.crear');
  const parsed = buildCatalogoSchema(def).safeParse(valoresCrudos);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' };

  const tenant = await getCurrentTenant();
  const cols = columnasBase(def);

  try {
    const [fila] = await db
      .insert(def.tabla)
      .values({ tenantId: tenant.id, ...prepararValores(def, parsed.data) })
      .returning({ id: cols.id });

    const id = fila?.id;
    if (!id) return { ok: false, error: 'No se pudo crear el registro.' };

    await writeAudit({
      tenantId: tenant.id,
      entidad: `infra.${slug}`,
      entidadId: String(id),
      accion: 'INSERT',
      permiso: 'infra.catalogos.crear',
      userId: session.user.id,
      userEmail: session.user.email ?? null,
      diff: buildDiff(null, parsed.data),
    });

    revalidatePath(`/infraestructura/${slug}`);
    return { ok: true, id: String(id) };
  } catch (error) {
    if (esViolacionDeUnicidad(error)) return { ok: false, error: 'Ya existe un registro con ese código.' };
    console.error(`[crearRegistro:${slug}]`, error);
    return { ok: false, error: 'No se pudo crear el registro.' };
  }
}

export async function actualizarRegistro(slug: string, id: string, valoresCrudos: ValoresDinamicos): Promise<AccionResultado> {
  const def = requireCatalogo(slug);
  const session = await requirePermission('infra.catalogos.editar');
  const parsed = buildCatalogoSchema(def).safeParse(valoresCrudos);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' };

  const tenant = await getCurrentTenant();
  const cols = columnasBase(def);

  const [antes] = await db
    .select()
    .from(def.tabla)
    .where(and(eq(cols.id, id), eq(cols.tenantId, tenant.id), isNull(cols.deletedAt)))
    .limit(1);
  if (!antes) return { ok: false, error: 'El registro ya no existe.' };

  try {
    await db
      .update(def.tabla)
      .set(prepararValores(def, parsed.data))
      .where(and(eq(cols.id, id), eq(cols.tenantId, tenant.id)));

    await writeAudit({
      tenantId: tenant.id,
      entidad: `infra.${slug}`,
      entidadId: id,
      accion: 'UPDATE',
      permiso: 'infra.catalogos.editar',
      userId: session.user.id,
      userEmail: session.user.email ?? null,
      diff: buildDiff(antes as Record<string, unknown>, parsed.data),
    });

    revalidatePath(`/infraestructura/${slug}`);
    return { ok: true, id };
  } catch (error) {
    if (esViolacionDeUnicidad(error)) return { ok: false, error: 'Ya existe un registro con ese código.' };
    console.error(`[actualizarRegistro:${slug}]`, error);
    return { ok: false, error: 'No se pudo guardar el registro.' };
  }
}

export async function alternarActivo(slug: string, id: string, activo: boolean): Promise<AccionResultado> {
  const def = requireCatalogo(slug);
  const session = await requirePermission('infra.catalogos.editar');
  const tenant = await getCurrentTenant();
  const cols = columnasBase(def);

  const [fila] = await db
    .update(def.tabla)
    .set({ activo })
    .where(and(eq(cols.id, id), eq(cols.tenantId, tenant.id)))
    .returning({ id: cols.id });

  if (!fila) return { ok: false, error: 'El registro ya no existe.' };

  await writeAudit({
    tenantId: tenant.id,
    entidad: `infra.${slug}`,
    entidadId: id,
    accion: 'UPDATE',
    permiso: 'infra.catalogos.editar',
    userId: session.user.id,
    userEmail: session.user.email ?? null,
    diff: { activo: { antes: !activo, despues: activo } },
  });

  revalidatePath(`/infraestructura/${slug}`);
  return { ok: true };
}

export async function eliminarRegistro(slug: string, id: string): Promise<AccionResultado> {
  const def = requireCatalogo(slug);
  const session = await requirePermission('infra.catalogos.eliminar');
  const tenant = await getCurrentTenant();
  const cols = columnasBase(def);

  const [fila] = await db
    .update(def.tabla)
    .set({ deletedAt: new Date(), activo: false })
    .where(and(eq(cols.id, id), eq(cols.tenantId, tenant.id), isNull(cols.deletedAt)))
    .returning({ id: cols.id });

  if (!fila) return { ok: false, error: 'El registro ya no existe.' };

  await writeAudit({
    tenantId: tenant.id,
    entidad: `infra.${slug}`,
    entidadId: id,
    accion: 'DELETE',
    nivel: 'CRITICO',
    permiso: 'infra.catalogos.eliminar',
    userId: session.user.id,
    userEmail: session.user.email ?? null,
    diff: { eliminado: { antes: id, despues: null } },
  });

  revalidatePath(`/infraestructura/${slug}`);
  return { ok: true };
}

export async function obtenerRegistroParaEditar(slug: string, id: string): Promise<ValoresDinamicos | null> {
  const def = requireCatalogo(slug);
  await requirePermission('infra.catalogos.ver');
  const tenant = await getCurrentTenant();
  const cols = columnasBase(def);

  const [fila] = await db
    .select()
    .from(def.tabla)
    .where(and(eq(cols.id, id), eq(cols.tenantId, tenant.id), isNull(cols.deletedAt)))
    .limit(1);
  if (!fila) return null;

  const registro = fila as unknown as Record<string, unknown>;
  const valores: ValoresDinamicos = {};
  for (const campo of def.campos) {
    const v = registro[campo.name];
    if (campo.tipo === 'booleano') valores[campo.name] = Boolean(v);
    else valores[campo.name] = v === null || v === undefined ? '' : String(v);
  }
  return valores;
}

/** Opciones (id → nombre) para cada campo de referencia del catálogo, filtradas por tenant y activo. */
export async function obtenerOpciones(slug: string): Promise<Record<string, { value: string; label: string }[]>> {
  const def = requireCatalogo(slug);
  await requirePermission('infra.catalogos.ver');
  const tenant = await getCurrentTenant();

  const resultado: Record<string, { value: string; label: string }[]> = {};
  for (const campo of def.campos) {
    if (campo.tipo !== 'referencia' || !campo.referenciaTabla) continue;
    const ref = campo.referenciaTabla;
    const filas = await db
      .select({ value: ref.id, label: ref.nombre })
      .from(ref.tabla)
      .where(and(eq(ref.tenantId, tenant.id), eq(ref.activo, true), isNull(ref.deletedAt)))
      .orderBy(ref.nombre);
    resultado[campo.name] = filas.map((f) => ({ value: String(f.value), label: String(f.label) }));
  }
  return resultado;
}

/* -------------------------------------------------------------------------- */
/* EXCEL — IMPORTAR / EXPORTAR (P-05)                                         */
/* -------------------------------------------------------------------------- */

export type FilaExportada = (string | number)[];

/** Encabezados + filas ya formateadas para volcar directo a una hoja de cálculo. */
export async function exportarFilas(
  slug: string,
  filtros: ColumnFilter[],
  search: string,
): Promise<{ headers: string[]; rows: FilaExportada[] }> {
  const def = requireCatalogo(slug);
  await requirePermission('infra.exportar');
  const tenant = await getCurrentTenant();
  const cols = columnasBase(def);
  const opciones = await obtenerOpciones(slug);

  const where = and(
    eq(cols.tenantId, tenant.id),
    isNull(cols.deletedAt),
    buildWhere(def.columnas, filtros, search, ['codigo', 'nombre']),
  );
  const filas = await db
    .select()
    .from(def.tabla)
    .where(where)
    .orderBy(def.columnas.nombre ?? cols.id);

  const headers = def.campos.map((c) => c.label);
  const rows: FilaExportada[] = (filas as unknown as Record<string, unknown>[]).map((fila) =>
    def.campos.map((campo) => {
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

export type ResultadoImportacion = {
  ok: true;
  jobId: string;
  total: number;
  filasOk: number;
  filasError: number;
  errores: { fila: number; error: string }[];
} | { ok: false; error: string };

/**
 * Importa filas ya parseadas desde el Excel (una por fila, claves = `campo.name`).
 * Cada fila se procesa de forma independiente: código existente → actualiza,
 * código nuevo → crea. Un error en una fila no detiene a las demás — el
 * resultado exacto queda en `import_jobs` (P-05).
 */
export async function importarFilas(
  slug: string,
  filasCrudas: Record<string, unknown>[],
  archivoNombre: string,
): Promise<ResultadoImportacion> {
  const def = requireCatalogo(slug);
  const session = await requirePermission('infra.importar');
  const tenant = await getCurrentTenant();
  const cols = columnasBase(def);
  const colCodigo = columnasDe(def).codigo;
  if (!colCodigo) return { ok: false, error: 'Este catálogo no admite importación.' };

  const [job] = await db
    .insert(importJobs)
    .values({ tenantId: tenant.id, catalogo: slug, archivoNombre, estado: 'PROCESANDO', totalFilas: filasCrudas.length, userId: session.user.id })
    .returning({ id: importJobs.id });
  if (!job) return { ok: false, error: 'No se pudo iniciar la importación.' };

  const schema = buildCatalogoSchema(def);
  const errores: { fila: number; error: string }[] = [];
  let filasOk = 0;

  for (let i = 0; i < filasCrudas.length; i++) {
    const numeroFila = i + 2; // fila 1 = encabezado
    const cruda = filasCrudas[i]!;
    const parsed = schema.safeParse(cruda);
    if (!parsed.success) {
      errores.push({ fila: numeroFila, error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' });
      continue;
    }

    try {
      const codigo = String(cruda.codigo ?? '').trim();
      const [existente] = await db
        .select({ id: cols.id })
        .from(def.tabla)
        .where(and(eq(cols.tenantId, tenant.id), eq(colCodigo, codigo), isNull(cols.deletedAt)))
        .limit(1);

      if (existente) {
        await db.update(def.tabla).set(prepararValores(def, parsed.data)).where(eq(cols.id, existente.id));
      } else {
        await db.insert(def.tabla).values({ tenantId: tenant.id, ...prepararValores(def, parsed.data) });
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
    entidad: `infra.${slug}`,
    accion: 'INSERT',
    nivel: 'CRITICO',
    permiso: 'infra.importar',
    userId: session.user.id,
    userEmail: session.user.email ?? null,
    diff: { importacion: { antes: null, despues: `${filasOk}/${filasCrudas.length} filas desde ${archivoNombre}` } },
  });

  revalidatePath(`/infraestructura/${slug}`);
  return { ok: true, jobId: job.id, total: filasCrudas.length, filasOk, filasError: errores.length, errores };
}
