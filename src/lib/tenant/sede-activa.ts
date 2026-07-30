'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { requireSession } from '@/lib/auth';

const COOKIE = 'sede_activa';

/** Lee la sede activa guardada en cookie — el layout la valida contra las sedes visibles del usuario antes de usarla. */
export async function leerSedeActivaCookie(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE)?.value ?? null;
}

/**
 * Cambia la sede activa del selector del topbar. Antes este control no
 * hacía nada — solo mostraba las sedes, sin ningún `onSelect` (§ "no me deja
 * cambiar de sede"). Se guarda en cookie (no en el JWT: cambiar de sede no
 * debería exigir volver a iniciar sesión) y persiste entre visitas.
 */
export async function cambiarSedeActiva(siteId: string | null): Promise<void> {
  const session = await requireSession();

  if (siteId !== null && session.user.scope !== 'TENANT' && !session.user.siteIds.includes(siteId)) {
    throw new Error('No tienes acceso a esa sede.');
  }

  const store = await cookies();
  if (siteId) {
    store.set(COOKIE, siteId, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 365 });
  } else {
    store.delete(COOKIE);
  }

  revalidatePath('/', 'layout');
}
