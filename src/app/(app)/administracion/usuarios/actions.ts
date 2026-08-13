'use server';

import { revalidatePath } from 'next/cache';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { dbTx, db, type DbTx } from '@/db';
import { roles as rolesTable, userRoles, userSiteAccess, users } from '@/db/schema';
import { requirePermission } from '@/lib/permissions';
import { codigosDeRoles, codigosDeRolesDeUsuario, esAdmin, incluyeRolProtegido } from '@/lib/permissions/roles-protegidos';
import { getCurrentTenant } from '@/lib/tenant';
import { hashPassword } from '@/lib/auth/password';
import { buildDiff, writeAudit } from '@/lib/audit';
import {
  actualizarUsuarioSchema,
  crearUsuarioSchema,
  type ActualizarUsuarioInput,
  type CrearUsuarioInput,
} from '@/lib/validators/usuario';

const PERMISO = 'admin.usuarios.gestionar';
const RUTA = '/administracion/usuarios';
const ERROR_ROL_PROTEGIDO = 'No tienes permiso para gestionar cuentas de Administrador o Gerente de Mantenimiento.';

export type AccionResultado = { ok: true } | { ok: false; error: string };

function esViolacionDeUnicidad(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === '23505';
}

type TxClient = Parameters<Parameters<DbTx['transaction']>[0]>[0];

/** Reemplaza roles y sedes de acceso del usuario: reconciliación exacta, igual que el seed. */
async function reemplazarRolesYSedes(
  tx: TxClient,
  userId: string,
  roleIds: string[],
  siteIds: string[],
  scopePorRol: Map<string, 'PROPIO' | 'SEDE' | 'TENANT'>,
): Promise<void> {
  await tx.delete(userRoles).where(eq(userRoles.userId, userId));
  await tx.delete(userSiteAccess).where(eq(userSiteAccess.userId, userId));

  if (roleIds.length > 0) {
    await tx.insert(userRoles).values(
      roleIds.map((roleId) => ({ userId, roleId, scope: scopePorRol.get(roleId) ?? 'SEDE' })),
    );
  }
  if (siteIds.length > 0) {
    await tx.insert(userSiteAccess).values(siteIds.map((siteId) => ({ userId, siteId })));
  }
}

async function cargarScopePorRol(tenantId: string, roleIds: string[]): Promise<Map<string, 'PROPIO' | 'SEDE' | 'TENANT'>> {
  if (roleIds.length === 0) return new Map();
  const filas = await db
    .select({ id: rolesTable.id, scopeDefault: rolesTable.scopeDefault })
    .from(rolesTable)
    .where(eq(rolesTable.tenantId, tenantId));
  return new Map(filas.filter((f) => roleIds.includes(f.id)).map((f) => [f.id, f.scopeDefault]));
}

export async function crearUsuario(input: CrearUsuarioInput): Promise<AccionResultado> {
  const session = await requirePermission(PERMISO);
  const parsed = crearUsuarioSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' };
  }
  const data = parsed.data;

  if (!esAdmin(session) && incluyeRolProtegido(await codigosDeRoles(data.roleIds))) {
    return { ok: false, error: ERROR_ROL_PROTEGIDO };
  }

  const tenant = await getCurrentTenant();
  const scopePorRol = await cargarScopePorRol(tenant.id, data.roleIds);

  try {
    const nuevoId = await dbTx.transaction(async (tx) => {
      const [nuevo] = await tx
        .insert(users)
        .values({
          tenantId: tenant.id,
          email: data.email,
          passwordHash: await hashPassword(data.password),
          nombre: data.nombre,
          cargo: data.cargo ?? null,
          telefono: data.telefono ?? null,
          siteDefaultId: data.siteDefaultId ?? null,
          activo: data.activo,
          passwordChangedAt: new Date(),
        })
        .returning({ id: users.id });

      if (!nuevo) throw new Error('No se pudo crear el usuario.');
      await reemplazarRolesYSedes(tx, nuevo.id, data.roleIds, data.siteIds, scopePorRol);
      return nuevo.id;
    });

    await writeAudit({
      tenantId: tenant.id,
      entidad: 'usuarios',
      entidadId: nuevoId,
      accion: 'INSERT',
      nivel: 'CRITICO',
      permiso: PERMISO,
      userId: session.user.id,
      userEmail: session.user.email ?? null,
      diff: buildDiff(null, { ...data, password: undefined }),
    });

    revalidatePath(RUTA);
    return { ok: true };
  } catch (error) {
    if (esViolacionDeUnicidad(error)) {
      return { ok: false, error: 'Ya existe un usuario con ese correo.' };
    }
    console.error('[crearUsuario]', error);
    return { ok: false, error: 'No se pudo crear el usuario.' };
  }
}

export async function actualizarUsuario(input: ActualizarUsuarioInput): Promise<AccionResultado> {
  const session = await requirePermission(PERMISO);
  const parsed = actualizarUsuarioSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' };
  }
  const data = parsed.data;
  const tenant = await getCurrentTenant();

  const [antes] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, data.id), eq(users.tenantId, tenant.id), isNull(users.deletedAt)))
    .limit(1);
  if (!antes) return { ok: false, error: 'El usuario ya no existe.' };

  if (!esAdmin(session)) {
    const [codigosActuales, codigosNuevos] = await Promise.all([codigosDeRolesDeUsuario(data.id), codigosDeRoles(data.roleIds)]);
    if (incluyeRolProtegido(codigosActuales) || incluyeRolProtegido(codigosNuevos)) {
      return { ok: false, error: ERROR_ROL_PROTEGIDO };
    }
  }

  const scopePorRol = await cargarScopePorRol(tenant.id, data.roleIds);
  const cambiaPassword = data.password.length > 0;

  try {
    await dbTx.transaction(async (tx) => {
      await tx
        .update(users)
        .set({
          email: data.email,
          nombre: data.nombre,
          cargo: data.cargo ?? null,
          telefono: data.telefono ?? null,
          siteDefaultId: data.siteDefaultId ?? null,
          activo: data.activo,
          ...(cambiaPassword
            ? {
                passwordHash: await hashPassword(data.password),
                passwordChangedAt: new Date(),
                // Cambiar la contraseña cierra las sesiones abiertas con la anterior (D-07).
                tokenVersion: sql`${users.tokenVersion} + 1`,
              }
            : {}),
        })
        .where(eq(users.id, data.id));

      await reemplazarRolesYSedes(tx, data.id, data.roleIds, data.siteIds, scopePorRol);
    });

    await writeAudit({
      tenantId: tenant.id,
      entidad: 'usuarios',
      entidadId: data.id,
      accion: 'UPDATE',
      nivel: 'CRITICO',
      permiso: PERMISO,
      userId: session.user.id,
      userEmail: session.user.email ?? null,
      diff: buildDiff(
        { nombre: antes.nombre, email: antes.email, cargo: antes.cargo, telefono: antes.telefono, activo: antes.activo, siteDefaultId: antes.siteDefaultId },
        { nombre: data.nombre, email: data.email, cargo: data.cargo ?? null, telefono: data.telefono ?? null, activo: data.activo, siteDefaultId: data.siteDefaultId ?? null },
      ),
    });

    revalidatePath(RUTA);
    return { ok: true };
  } catch (error) {
    if (esViolacionDeUnicidad(error)) {
      return { ok: false, error: 'Ya existe un usuario con ese correo.' };
    }
    console.error('[actualizarUsuario]', error);
    return { ok: false, error: 'No se pudo guardar el usuario.' };
  }
}

export async function cambiarEstadoUsuario(id: string, activo: boolean): Promise<AccionResultado> {
  const session = await requirePermission(PERMISO);
  if (id === session.user.id) {
    return { ok: false, error: 'No puedes desactivar tu propia cuenta.' };
  }
  if (!esAdmin(session) && incluyeRolProtegido(await codigosDeRolesDeUsuario(id))) {
    return { ok: false, error: ERROR_ROL_PROTEGIDO };
  }
  const tenant = await getCurrentTenant();

  const [fila] = await dbTx
    .update(users)
    .set({ activo, ...(activo ? {} : { tokenVersion: sql`${users.tokenVersion} + 1` }) })
    .where(and(eq(users.id, id), eq(users.tenantId, tenant.id)))
    .returning({ id: users.id, email: users.email });

  if (!fila) return { ok: false, error: 'El usuario ya no existe.' };

  await writeAudit({
    tenantId: tenant.id,
    entidad: 'usuarios',
    entidadId: fila.id,
    accion: 'UPDATE',
    nivel: 'CRITICO',
    permiso: PERMISO,
    userId: session.user.id,
    userEmail: session.user.email ?? null,
    diff: { activo: { antes: !activo, despues: activo } },
  });

  revalidatePath(RUTA);
  return { ok: true };
}

export async function eliminarUsuario(id: string): Promise<AccionResultado> {
  const session = await requirePermission(PERMISO);
  if (id === session.user.id) {
    return { ok: false, error: 'No puedes eliminar tu propia cuenta.' };
  }
  if (!esAdmin(session) && incluyeRolProtegido(await codigosDeRolesDeUsuario(id))) {
    return { ok: false, error: ERROR_ROL_PROTEGIDO };
  }
  const tenant = await getCurrentTenant();

  const [fila] = await dbTx
    .update(users)
    .set({ deletedAt: new Date(), activo: false, tokenVersion: sql`${users.tokenVersion} + 1` })
    .where(and(eq(users.id, id), eq(users.tenantId, tenant.id), isNull(users.deletedAt)))
    .returning({ id: users.id, email: users.email });

  if (!fila) return { ok: false, error: 'El usuario ya no existe.' };

  await writeAudit({
    tenantId: tenant.id,
    entidad: 'usuarios',
    entidadId: fila.id,
    accion: 'DELETE',
    nivel: 'CRITICO',
    permiso: PERMISO,
    userId: session.user.id,
    userEmail: session.user.email ?? null,
    diff: { eliminado: { antes: fila.email, despues: null } },
  });

  revalidatePath(RUTA);
  return { ok: true };
}

export type UsuarioParaEditar = {
  id: string;
  nombre: string;
  email: string;
  cargo: string;
  telefono: string;
  siteDefaultId: string;
  activo: boolean;
  roleIds: string[];
  siteIds: string[];
};

export async function obtenerUsuarioParaEditar(id: string): Promise<UsuarioParaEditar | null> {
  await requirePermission(PERMISO);
  const tenant = await getCurrentTenant();

  const [usuario] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, id), eq(users.tenantId, tenant.id), isNull(users.deletedAt)))
    .limit(1);
  if (!usuario) return null;

  const [rolesAsignados, sedesAsignadas] = await Promise.all([
    db.select({ roleId: userRoles.roleId }).from(userRoles).where(eq(userRoles.userId, id)),
    db.select({ siteId: userSiteAccess.siteId }).from(userSiteAccess).where(eq(userSiteAccess.userId, id)),
  ]);

  return {
    id: usuario.id,
    nombre: usuario.nombre,
    email: usuario.email,
    cargo: usuario.cargo ?? '',
    telefono: usuario.telefono ?? '',
    siteDefaultId: usuario.siteDefaultId ?? '',
    activo: usuario.activo,
    roleIds: rolesAsignados.map((r) => r.roleId),
    siteIds: sedesAsignadas.map((s) => s.siteId),
  };
}
