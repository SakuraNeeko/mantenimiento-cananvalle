'use server';

import { revalidatePath } from 'next/cache';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { notifications } from '@/db/schema';
import { requireSession } from '@/lib/auth';

export type NotificacionRow = {
  id: string;
  tipo: string;
  titulo: string;
  cuerpo: string | null;
  link: string | null;
  leidaAt: Date | null;
  createdAt: Date;
};

/** Últimas notificaciones del usuario logueado — la campana del topbar las pide al abrirse, no antes. */
export async function obtenerMisNotificaciones(): Promise<NotificacionRow[]> {
  const session = await requireSession();
  return db
    .select({
      id: notifications.id,
      tipo: notifications.tipo,
      titulo: notifications.titulo,
      cuerpo: notifications.cuerpo,
      link: notifications.link,
      leidaAt: notifications.leidaAt,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .where(eq(notifications.userId, session.user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(20);
}

export async function marcarNotificacionLeida(id: string): Promise<void> {
  const session = await requireSession();
  await db
    .update(notifications)
    .set({ leidaAt: new Date() })
    .where(and(eq(notifications.id, id), eq(notifications.userId, session.user.id), isNull(notifications.leidaAt)));
  revalidatePath('/', 'layout');
}

export async function marcarTodasLeidas(): Promise<void> {
  const session = await requireSession();
  await db.update(notifications).set({ leidaAt: new Date() }).where(and(eq(notifications.userId, session.user.id), isNull(notifications.leidaAt)));
  revalidatePath('/', 'layout');
}
