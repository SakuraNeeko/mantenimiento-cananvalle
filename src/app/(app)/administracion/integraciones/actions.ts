'use server';

import { revalidatePath } from 'next/cache';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { apiKeys, webhookDeliveries } from '@/db/schema';
import { requirePermission } from '@/lib/permissions';
import { getCurrentTenant } from '@/lib/tenant';
import { writeAudit } from '@/lib/audit';
import { ALCANCES_API, generarApiKey, type AlcanceApi } from '@/lib/api-publica/auth';

export type AccionResultado = { ok: true } | { ok: false; error: string };

export async function obtenerApiKeys() {
  await requirePermission('admin.integraciones.gestionar');
  const tenant = await getCurrentTenant();
  return db
    .select({
      id: apiKeys.id,
      nombre: apiKeys.nombre,
      prefijo: apiKeys.prefijo,
      permisos: apiKeys.permisos,
      expiraAt: apiKeys.expiraAt,
      revocadaAt: apiKeys.revocadaAt,
      createdAt: apiKeys.createdAt,
    })
    .from(apiKeys)
    .where(and(eq(apiKeys.tenantId, tenant.id), isNull(apiKeys.deletedAt)))
    .orderBy(desc(apiKeys.createdAt));
}

export async function crearApiKey(nombre: string, alcance: AlcanceApi[]): Promise<{ ok: true; keyEnClaro: string } | { ok: false; error: string }> {
  const session = await requirePermission('admin.integraciones.gestionar');
  const tenant = await getCurrentTenant();
  if (!nombre.trim()) return { ok: false, error: 'Ponle un nombre a la API key.' };
  const alcanceValido = alcance.filter((a): a is AlcanceApi => (ALCANCES_API as readonly string[]).includes(a));
  if (alcanceValido.length === 0) return { ok: false, error: 'Selecciona al menos un alcance.' };

  const { keyEnClaro, hash, prefijo } = generarApiKey();

  await db.insert(apiKeys).values({
    tenantId: tenant.id,
    nombre: nombre.trim(),
    hash,
    prefijo,
    permisos: alcanceValido,
    createdBy: session.user.id,
  });

  await writeAudit({
    tenantId: tenant.id,
    entidad: 'admin.integraciones',
    accion: 'INSERT',
    nivel: 'CRITICO',
    permiso: 'admin.integraciones.gestionar',
    userId: session.user.id,
    userEmail: session.user.email ?? null,
    diff: { apiKey: { antes: null, despues: `${nombre} (${prefijo}…)` } },
  });

  revalidatePath('/administracion/integraciones');
  return { ok: true, keyEnClaro };
}

export async function revocarApiKey(id: string): Promise<AccionResultado> {
  const session = await requirePermission('admin.integraciones.gestionar');
  const tenant = await getCurrentTenant();

  const [fila] = await db
    .update(apiKeys)
    .set({ revocadaAt: new Date() })
    .where(and(eq(apiKeys.id, id), eq(apiKeys.tenantId, tenant.id)))
    .returning({ id: apiKeys.id });
  if (!fila) return { ok: false, error: 'La API key ya no existe.' };

  await writeAudit({
    tenantId: tenant.id,
    entidad: 'admin.integraciones',
    entidadId: id,
    accion: 'DELETE',
    nivel: 'CRITICO',
    permiso: 'admin.integraciones.gestionar',
    userId: session.user.id,
    userEmail: session.user.email ?? null,
    diff: { revocada: { antes: false, despues: true } },
  });

  revalidatePath('/administracion/integraciones');
  return { ok: true };
}

export async function obtenerWebhookDeliveries() {
  await requirePermission('admin.integraciones.gestionar');
  const tenant = await getCurrentTenant();
  return db
    .select({ id: webhookDeliveries.id, url: webhookDeliveries.url, ok: webhookDeliveries.ok, statusCode: webhookDeliveries.statusCode, error: webhookDeliveries.error, createdAt: webhookDeliveries.createdAt })
    .from(webhookDeliveries)
    .where(eq(webhookDeliveries.tenantId, tenant.id))
    .orderBy(desc(webhookDeliveries.createdAt))
    .limit(50);
}
