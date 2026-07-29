'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/permissions';
import { getCurrentTenant } from '@/lib/tenant';
import { writeAudit } from '@/lib/audit';
import { confirmarCandidatos, evaluarGeneracion, type Candidato } from '@/lib/planes/generador';

export async function previsualizarGeneracion(): Promise<Candidato[]> {
  await requirePermission('planes.generar_ot');
  const tenant = await getCurrentTenant();
  return evaluarGeneracion(tenant.id);
}

export type ConfirmacionResultado = { ok: true; generadas: number; omitidas: number; errores: number } | { ok: false; error: string };

/**
 * Vuelve a evaluar en el servidor (nunca confía en los candidatos que ya
 * tenía el cliente) y solo confirma los que el usuario seleccionó y que
 * siguen siendo `GENERADA` en esta nueva evaluación.
 */
export async function confirmarGeneracionManual(keys: string[]): Promise<ConfirmacionResultado> {
  const session = await requirePermission('planes.generar_ot');
  if (keys.length === 0) return { ok: false, error: 'Selecciona al menos una orden para generar.' };

  const tenant = await getCurrentTenant();
  const candidatos = await evaluarGeneracion(tenant.id);
  const seleccionados = candidatos.filter((c) => keys.includes(c.key) && c.resultado === 'GENERADA');
  if (seleccionados.length === 0) return { ok: false, error: 'Ninguno de los candidatos seleccionados sigue vigente. Vuelve a analizar.' };

  const resultado = await confirmarCandidatos(tenant.id, seleccionados);

  await writeAudit({
    tenantId: tenant.id,
    entidad: 'planes',
    entidadId: null,
    accion: 'INSERT',
    nivel: 'CRITICO',
    permiso: 'planes.generar_ot',
    userId: session.user.id,
    diff: { generacion_manual: { antes: null, despues: `${resultado.generadas} OT generadas` } },
  });

  revalidatePath('/ordenes');
  revalidatePath('/planes');
  return { ok: true, generadas: resultado.generadas, omitidas: resultado.omitidas, errores: resultado.errores.length };
}
