'use server';

import { put } from '@vercel/blob';
import { and, desc, eq, isNull, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { assets, syncConflicts, woTasks, workOrders } from '@/db/schema';
import { requirePermission } from '@/lib/permissions';
import { getCurrentTenant } from '@/lib/tenant';
import { registrarConflicto } from '@/lib/sync/conflicts';
import type { OperacionCola, OrdenCacheada, ResultadoSync } from '@/lib/movil/tipos';
import { completarTarea } from '../../(app)/ordenes/[id]/tareas/actions';
import {
  agregarComentarioOrden,
  firmarComoEjecutor,
  iniciarEjecucion,
  marcarEjecutada,
  marcarPendiente,
  reanudarEjecucion,
} from '../../(app)/ordenes/actions';

/**
 * Reproduce en el servidor, en orden, cada operación que el técnico ejecutó
 * sin conexión. Reutiliza las mismas Server Actions del escritorio — nunca
 * duplica la lógica de negocio — y solo añade la detección de conflicto:
 * "última escritura gana" (§"Experiencia móvil"), la escritura offline
 * SIEMPRE se aplica, pero si el valor ya había cambiado en el servidor se
 * deja constancia en `sync_conflicts` para revisión posterior.
 */
export async function procesarOperacionCola(op: OperacionCola): Promise<ResultadoSync> {
  const session = await requirePermission('ordenes.ver');
  const tenant = await getCurrentTenant();

  switch (op.tipo) {
    case 'TAREA': {
      const [actual] = await db
        .select({ resultado: woTasks.resultado, valorMedido: woTasks.valorMedido, completadaAt: woTasks.completadaAt })
        .from(woTasks)
        .where(and(eq(woTasks.id, op.tareaId), eq(woTasks.workOrderId, op.ordenId)))
        .limit(1);

      let conflicto = false;
      if (actual?.completadaAt && (actual.resultado ?? '') !== (op.datos.resultado ?? '')) {
        conflicto = true;
        await registrarConflicto({
          tenantId: tenant.id,
          entidad: 'wo_tasks',
          entidadId: op.tareaId,
          campo: 'resultado',
          valorServidor: actual.resultado,
          valorCliente: op.datos.resultado,
          workOrderId: op.ordenId,
          userId: session.user.id,
        });
      }

      const resultado = await completarTarea(op.ordenId, op.tareaId, op.datos);
      return resultado.ok ? { ok: true, conflicto } : resultado;
    }

    case 'COMENTARIO': {
      // Un comentario nunca "pisa" nada — solo se agrega.
      return agregarComentarioOrden(op.ordenId, op.mensaje);
    }

    case 'FIRMA': {
      const [actual] = await db
        .select({ firmaEjecutorUserId: workOrders.firmaEjecutorUserId })
        .from(workOrders)
        .where(eq(workOrders.id, op.ordenId))
        .limit(1);

      let conflicto = false;
      if (actual?.firmaEjecutorUserId && actual.firmaEjecutorUserId !== session.user.id) {
        conflicto = true;
        await registrarConflicto({
          tenantId: tenant.id,
          entidad: 'work_orders',
          entidadId: op.ordenId,
          campo: 'firma_ejecutor_user_id',
          valorServidor: actual.firmaEjecutorUserId,
          valorCliente: session.user.id,
          workOrderId: op.ordenId,
          userId: session.user.id,
        });
      }

      const resultado = await firmarComoEjecutor(op.ordenId);
      return resultado.ok ? { ok: true, conflicto } : resultado;
    }

    case 'TRANSICION': {
      // Las transiciones de estado ya validan su propia precondición (p.ej.
      // "solo se puede iniciar una orden ASIGNADA"): si alguien más cambió el
      // estado desde el escritorio mientras el técnico estaba sin conexión,
      // la Server Action original devuelve el error — aquí solo lo registramos
      // como conflicto en vez de aplicar una transición que ya no es válida
      // (a diferencia de TAREA/FIRMA, forzarla rompería la máquina de estados).
      const previo = await db.select({ estado: workOrders.estado }).from(workOrders).where(eq(workOrders.id, op.ordenId)).limit(1);
      const estadoServidor = previo[0]?.estado;

      const resultado =
        op.accion === 'iniciar'
          ? await iniciarEjecucion(op.ordenId)
          : op.accion === 'pendiente'
            ? await marcarPendiente(op.ordenId, op.causaPendienteId ?? '', op.motivo ?? '')
            : op.accion === 'reanudar'
              ? await reanudarEjecucion(op.ordenId)
              : await marcarEjecutada(op.ordenId);

      if (!resultado.ok) {
        await registrarConflicto({
          tenantId: tenant.id,
          entidad: 'work_orders',
          entidadId: op.ordenId,
          campo: 'estado',
          valorServidor: estadoServidor,
          valorCliente: op.accion,
          workOrderId: op.ordenId,
          userId: session.user.id,
        });
      }
      return resultado;
    }

    default:
      return { ok: false, error: 'Operación desconocida.' };
  }
}

const TAMANO_MAXIMO_BYTES = 8 * 1024 * 1024;

/** Sube la evidencia fotográfica de una tarea del checklist (§"captura de fotos... sin conexión"). */
export async function subirFotoTareaMovil(ordenId: string, tareaId: string, formData: FormData): Promise<ResultadoSync> {
  await requirePermission('ordenes.tareas.registrar');

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: 'No se recibió ninguna foto.' };
  if (!file.type.startsWith('image/')) return { ok: false, error: 'Solo se aceptan imágenes.' };
  if (file.size > TAMANO_MAXIMO_BYTES) return { ok: false, error: 'La foto supera los 8 MB.' };

  try {
    const blob = await put(`ordenes/${ordenId}/tareas/${tareaId}-${Date.now()}.jpg`, file, { access: 'public' });
    await db.update(woTasks).set({ fotoUrl: blob.url }).where(and(eq(woTasks.id, tareaId), eq(woTasks.workOrderId, ordenId)));
    return { ok: true };
  } catch (error) {
    console.error('[subirFotoTareaMovil]', error);
    return { ok: false, error: 'No se pudo subir la foto. Se reintentará en la próxima sincronización.' };
  }
}

/** Trae las OT asignadas al técnico logueado, con su checklist, para cachear offline en IndexedDB. */
export async function obtenerMisOrdenesParaCache(): Promise<OrdenCacheada[]> {
  const session = await requirePermission('ordenes.ver');
  const tenant = await getCurrentTenant();

  const ordenes = await db
    .select({
      id: workOrders.id,
      consecutivo: workOrders.consecutivo,
      descripcionProblema: workOrders.descripcionProblema,
      estado: workOrders.estado,
      prioridad: workOrders.prioridad,
      criticidad: workOrders.criticidad,
      assetCodigo: assets.codigo,
      assetNombre: assets.nombre,
      fechaProgramada: workOrders.fechaProgramada,
      firmaEjecutorAt: workOrders.firmaEjecutorAt,
      updatedAt: workOrders.updatedAt,
    })
    .from(workOrders)
    .leftJoin(assets, eq(assets.id, workOrders.assetId))
    .where(
      and(
        eq(workOrders.tenantId, tenant.id),
        eq(workOrders.responsablePrincipalUserId, session.user.id),
        inArray(workOrders.estado, ['ASIGNADA', 'EN_EJECUCION', 'PENDIENTE', 'EJECUTADA']),
        isNull(workOrders.deletedAt),
      ),
    )
    .orderBy(workOrders.fechaProgramada);

  if (ordenes.length === 0) return [];

  const tareas = await db
    .select({
      id: woTasks.id,
      workOrderId: woTasks.workOrderId,
      orden: woTasks.orden,
      descripcion: woTasks.descripcion,
      tipoRespuesta: woTasks.tipoRespuesta,
      esCritica: woTasks.esCritica,
      resultado: woTasks.resultado,
      valorMedido: woTasks.valorMedido,
      observacion: woTasks.observacion,
      fotoUrl: woTasks.fotoUrl,
      completadaAt: woTasks.completadaAt,
    })
    .from(woTasks)
    .where(
      inArray(
        woTasks.workOrderId,
        ordenes.map((o) => o.id),
      ),
    )
    .orderBy(woTasks.orden);

  return ordenes.map((ot) => ({
    id: ot.id,
    consecutivo: ot.consecutivo,
    descripcionProblema: ot.descripcionProblema,
    estado: ot.estado,
    prioridad: ot.prioridad,
    criticidad: ot.criticidad,
    assetCodigo: ot.assetCodigo,
    assetNombre: ot.assetNombre,
    fechaProgramada: ot.fechaProgramada ? ot.fechaProgramada.toISOString() : null,
    firmaEjecutorAt: ot.firmaEjecutorAt ? ot.firmaEjecutorAt.toISOString() : null,
    actualizadoEn: ot.updatedAt.toISOString(),
    tareas: tareas
      .filter((t) => t.workOrderId === ot.id)
      .map((t) => ({
        id: t.id,
        orden: t.orden,
        descripcion: t.descripcion,
        tipoRespuesta: t.tipoRespuesta,
        esCritica: t.esCritica,
        resultado: t.resultado,
        valorMedido: t.valorMedido,
        observacion: t.observacion,
        fotoUrl: t.fotoUrl,
        completadaAt: t.completadaAt ? t.completadaAt.toISOString() : null,
      })),
  }));
}

export type ConflictoSync = { id: string; entidad: string; campo: string; valorServidor: string | null; valorCliente: string | null; fecha: string };

/** Conflictos "última escritura gana" resueltos con las operaciones del propio técnico, para que revise qué se sobrescribió. */
export async function obtenerMisConflictosSync(): Promise<ConflictoSync[]> {
  const session = await requirePermission('ordenes.ver');
  const filas = await db
    .select({
      id: syncConflicts.id,
      entidad: syncConflicts.entidad,
      campo: syncConflicts.campo,
      valorServidor: syncConflicts.valorServidor,
      valorCliente: syncConflicts.valorCliente,
      fecha: syncConflicts.fecha,
    })
    .from(syncConflicts)
    .where(eq(syncConflicts.userId, session.user.id))
    .orderBy(desc(syncConflicts.fecha))
    .limit(20);

  return filas.map((f) => ({ ...f, fecha: f.fecha.toISOString() }));
}
