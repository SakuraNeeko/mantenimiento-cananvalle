'use server';

import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { tenantModules } from '@/db/schema';
import { requirePermission } from '@/lib/permissions';
import { getCurrentTenant } from '@/lib/tenant';
import { writeAudit } from '@/lib/audit';

export type AccionResultado = { ok: true } | { ok: false; error: string };

export async function alternarModulo(modulo: string, habilitado: boolean): Promise<AccionResultado> {
  const session = await requirePermission('admin.modulos.activar');
  const tenant = await getCurrentTenant();

  await db
    .insert(tenantModules)
    .values({ tenantId: tenant.id, modulo, habilitado })
    .onConflictDoUpdate({ target: [tenantModules.tenantId, tenantModules.modulo], set: { habilitado } });

  await writeAudit({
    tenantId: tenant.id,
    entidad: 'admin.modulos',
    entidadId: null,
    accion: 'UPDATE',
    nivel: 'CRITICO',
    permiso: 'admin.modulos.activar',
    userId: session.user.id,
    diff: { [modulo]: { antes: !habilitado, despues: habilitado } },
  });

  revalidatePath('/administracion/modulos');
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function obtenerModulos() {
  await requirePermission('admin.modulos.activar');
  const tenant = await getCurrentTenant();
  const filas = await db.select().from(tenantModules).where(eq(tenantModules.tenantId, tenant.id));
  const mapa = new Map(filas.map((f) => [f.modulo, f.habilitado]));

  return [
    { modulo: 'combustibles', nombre: 'Combustibles', descripcion: 'Registro de abastecimiento, rendimiento y consumos anómalos (Fase 10).', habilitado: mapa.get('combustibles') ?? false },
    { modulo: 'tecnovigilancia', nombre: 'Tecnovigilancia', descripcion: 'Eventos adversos y alertas de fabricante para equipos biomédicos (Fase 10).', habilitado: mapa.get('tecnovigilancia') ?? false },
    { modulo: 'automatizador', nombre: 'Automatizador', descripcion: 'Motor de reglas disparador → condiciones → acciones (Fase 12, todavía no construido).', habilitado: mapa.get('automatizador') ?? false },
  ];
}
