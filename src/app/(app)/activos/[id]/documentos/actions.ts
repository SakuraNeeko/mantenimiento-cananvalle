'use server';

import { revalidatePath } from 'next/cache';
import { put, del } from '@vercel/blob';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { assetDocuments, assets } from '@/db/schema';
import { requirePermission } from '@/lib/permissions';
import { getCurrentTenant } from '@/lib/tenant';
import { writeAudit } from '@/lib/audit';

export type AccionResultado = { ok: true } | { ok: false; error: string };

const TIPOS_MIME_PERMITIDOS = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);
const TAMANO_MAXIMO_BYTES = 15 * 1024 * 1024;

/**
 * Sube el archivo a Vercel Blob y guarda la referencia. Requiere
 * `BLOB_READ_WRITE_TOKEN` en el entorno — sin él, `put()` lanza y esta
 * acción devuelve un error controlado en vez de una pantalla en blanco.
 */
export async function subirDocumento(assetId: string, tipo: string, formData: FormData): Promise<AccionResultado> {
  const session = await requirePermission('activos.documentos.gestionar');
  const tenant = await getCurrentTenant();

  const [asset] = await db.select({ id: assets.id }).from(assets).where(and(eq(assets.id, assetId), eq(assets.tenantId, tenant.id), isNull(assets.deletedAt))).limit(1);
  if (!asset) return { ok: false, error: 'El activo ya no existe.' };

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: 'Selecciona un archivo.' };
  if (!TIPOS_MIME_PERMITIDOS.has(file.type)) return { ok: false, error: 'Tipo de archivo no permitido. Usa PDF, Word, Excel o una imagen.' };
  if (file.size > TAMANO_MAXIMO_BYTES) return { ok: false, error: 'El archivo supera los 15 MB.' };

  const nombreSaneado = file.name.replace(/[^\w.\-]+/g, '_');

  try {
    const blob = await put(`activos/${assetId}/${Date.now()}-${nombreSaneado}`, file, { access: 'public' });

    await db.insert(assetDocuments).values({
      tenantId: tenant.id,
      assetId,
      tipo: tipo as typeof assetDocuments.$inferSelect.tipo,
      nombre: file.name,
      blobUrl: blob.url,
      mimeType: file.type,
      bytes: file.size,
    });

    await writeAudit({
      tenantId: tenant.id,
      entidad: 'activos.documentos',
      entidadId: assetId,
      accion: 'INSERT',
      permiso: 'activos.documentos.gestionar',
      userId: session.user.id,
      userEmail: session.user.email ?? null,
      diff: { documento: { antes: null, despues: file.name } },
    });

    revalidatePath(`/activos/${assetId}/documentos`);
    return { ok: true };
  } catch (error) {
    console.error('[subirDocumento]', error);
    return { ok: false, error: 'No se pudo subir el archivo. Verifica que BLOB_READ_WRITE_TOKEN esté configurado.' };
  }
}

export async function eliminarDocumento(assetId: string, documentoId: string): Promise<AccionResultado> {
  const session = await requirePermission('activos.documentos.gestionar');
  const tenant = await getCurrentTenant();

  const [doc] = await db
    .select({ id: assetDocuments.id, blobUrl: assetDocuments.blobUrl, nombre: assetDocuments.nombre })
    .from(assetDocuments)
    .where(and(eq(assetDocuments.id, documentoId), eq(assetDocuments.tenantId, tenant.id), eq(assetDocuments.assetId, assetId), isNull(assetDocuments.deletedAt)))
    .limit(1);
  if (!doc) return { ok: false, error: 'El documento ya no existe.' };

  try {
    await del(doc.blobUrl);
  } catch (error) {
    console.error('[eliminarDocumento] no se pudo borrar el blob', error);
  }

  await db.update(assetDocuments).set({ deletedAt: new Date() }).where(eq(assetDocuments.id, documentoId));

  await writeAudit({
    tenantId: tenant.id,
    entidad: 'activos.documentos',
    entidadId: assetId,
    accion: 'DELETE',
    permiso: 'activos.documentos.gestionar',
    userId: session.user.id,
    userEmail: session.user.email ?? null,
    diff: { documento: { antes: doc.nombre, despues: null } },
  });

  revalidatePath(`/activos/${assetId}/documentos`);
  return { ok: true };
}

export async function obtenerDocumentos(assetId: string) {
  await requirePermission('activos.ver');
  return db
    .select({ id: assetDocuments.id, tipo: assetDocuments.tipo, nombre: assetDocuments.nombre, blobUrl: assetDocuments.blobUrl, mimeType: assetDocuments.mimeType, bytes: assetDocuments.bytes, createdAt: assetDocuments.createdAt })
    .from(assetDocuments)
    .where(and(eq(assetDocuments.assetId, assetId), isNull(assetDocuments.deletedAt)))
    .orderBy(desc(assetDocuments.createdAt));
}
