import { NextResponse } from 'next/server';
import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { users } from '@/db/schema';
import { requirePermission } from '@/lib/permissions';
import { codigosDeRolesDeUsuario, esAdmin, incluyeRolProtegido } from '@/lib/permissions/roles-protegidos';
import { getCurrentTenant } from '@/lib/tenant';
import { writeAudit } from '@/lib/audit';
import { ForbiddenError, UnauthorizedError } from '@/lib/permissions/guard';

const paramsSchema = z.object({ id: z.string().uuid() });

/**
 * Cierra la sesión del usuario en todos los dispositivos, de inmediato.
 * Cierra la deuda técnica D-07 (§6 de ENTREGA-FASE-1.md): incrementar
 * `token_version` hace que el callback `jwt` invalide cualquier JWT emitido
 * antes de este momento, sin esperar a que caduque (12 h).
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePermission('admin.usuarios.gestionar');
    const { id } = paramsSchema.parse(await params);

    if (!esAdmin(session) && incluyeRolProtegido(await codigosDeRolesDeUsuario(id))) {
      return NextResponse.json({ error: 'No tienes permiso para gestionar cuentas de Administrador o Gerente de Mantenimiento.' }, { status: 403 });
    }

    const tenant = await getCurrentTenant();

    const [row] = await db
      .update(users)
      .set({ tokenVersion: sql`${users.tokenVersion} + 1` })
      .where(and(eq(users.id, id), eq(users.tenantId, tenant.id)))
      .returning({ id: users.id, email: users.email, tokenVersion: users.tokenVersion });

    if (!row) {
      return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 });
    }

    await writeAudit({
      tenantId: tenant.id,
      entidad: 'usuarios',
      entidadId: row.id,
      accion: 'UPDATE',
      nivel: 'CRITICO',
      permiso: 'admin.usuarios.gestionar',
      userId: session.user.id,
      userEmail: session.user.email ?? null,
      diff: { sesionesInvalidadas: { antes: null, despues: row.email } },
    });

    return NextResponse.json({ ok: true, tokenVersion: row.tokenVersion });
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof ForbiddenError) return NextResponse.json({ error: error.message }, { status: 403 });
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Identificador inválido.' }, { status: 400 });
    console.error('[invalidar-sesiones]', error);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
