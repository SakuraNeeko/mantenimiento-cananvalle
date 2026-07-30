import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { and, eq, gte, isNull, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { loginAttempts, rolePermissions, roles, userRoles, userSiteAccess, users } from '@/db/schema';
import type { Scope } from '@/db/schema';
import { authConfig } from './config';
import { verifyPassword } from './password';

const credentialsSchema = z.object({
  email: z.string().email({ message: 'Correo no válido.' }),
  password: z.string().min(1, { message: 'La contraseña es obligatoria.' }),
});

const MAX_ATTEMPTS = 5;
const WINDOW_MINUTES = 15;
/** Más alto que MAX_ATTEMPTS: una IP puede ser una oficina entera detrás de NAT — el límite por
 * email ya frena fuerza bruta contra UNA cuenta; este frena "credential spraying" contra MUCHAS. */
const MAX_ATTEMPTS_IP = 20;

/** Precedencia de alcance: el más amplio de todos los roles del usuario. */
const SCOPE_RANK: Record<Scope, number> = { PROPIO: 0, SEDE: 1, TENANT: 2 };

export type SessionProfile = {
  id: string;
  tenantId: string;
  email: string;
  nombre: string;
  permissions: string[];
  roles: string[];
  scope: Scope;
  siteIds: string[];
  siteDefaultId: string | null;
  tokenVersion: number;
};

/**
 * Carga el perfil completo de autorización en una sola ida a la base.
 * Se ejecuta SOLO en el login; después viaja dentro del JWT.
 */
export async function loadSessionProfile(userId: string): Promise<SessionProfile | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, userId), eq(users.activo, true), isNull(users.deletedAt)))
    .limit(1);

  if (!user) return null;

  const roleRows = await db
    .select({
      codigo: roles.codigo,
      scope: userRoles.scope,
      permiso: rolePermissions.permissionCode,
    })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .leftJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
    .where(and(eq(userRoles.userId, userId), eq(roles.activo, true)));

  const siteRows = await db
    .select({ siteId: userSiteAccess.siteId })
    .from(userSiteAccess)
    .where(eq(userSiteAccess.userId, userId));

  const permissions = new Set<string>();
  const roleCodes = new Set<string>();
  let scope: Scope = 'PROPIO';

  for (const row of roleRows) {
    roleCodes.add(row.codigo);
    if (row.permiso) permissions.add(row.permiso);
    if (SCOPE_RANK[row.scope] > SCOPE_RANK[scope]) scope = row.scope;
  }

  return {
    id: user.id,
    tenantId: user.tenantId,
    email: user.email,
    nombre: user.nombre,
    permissions: [...permissions],
    roles: [...roleCodes],
    scope,
    siteIds: siteRows.map((s) => s.siteId),
    siteDefaultId: user.siteDefaultId,
    tokenVersion: user.tokenVersion,
  };
}

async function recentFailures(email: string): Promise<number> {
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000);
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(loginAttempts)
    .where(
      and(
        eq(loginAttempts.email, email),
        eq(loginAttempts.exitoso, false),
        gte(loginAttempts.createdAt, since),
      ),
    );
  return row?.n ?? 0;
}

async function recentFailuresByIp(ip: string): Promise<number> {
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000);
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(loginAttempts)
    .where(and(eq(loginAttempts.ip, ip), eq(loginAttempts.exitoso, false), gte(loginAttempts.createdAt, since)));
  return row?.n ?? 0;
}

/** `x-forwarded-for` puede traer una lista "cliente, proxy1, proxy2…" — el primero es el real. */
function extraerIp(request: Request): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]!.trim();
  return request.headers.get('x-real-ip');
}

async function logAttempt(email: string, exitoso: boolean, motivo?: string, ip?: string | null, userAgent?: string | null): Promise<void> {
  await db.insert(loginAttempts).values({ email, exitoso, motivo: motivo ?? null, ip: ip ?? null, userAgent: userAgent ?? null });
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Correo', type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(raw, request) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const email = parsed.data.email.toLowerCase().trim();
        const ip = extraerIp(request);
        const userAgent = request.headers.get('user-agent');

        if ((await recentFailures(email)) >= MAX_ATTEMPTS) {
          await logAttempt(email, false, 'BLOQUEADO_POR_INTENTOS', ip, userAgent);
          throw new Error('Cuenta bloqueada temporalmente por intentos fallidos. Espera 15 minutos.');
        }

        // Frena "credential spraying" (muchos correos distintos desde la misma IP), un patrón
        // que el bloqueo por email no detecta porque cada cuenta individual ve pocos intentos.
        if (ip && (await recentFailuresByIp(ip)) >= MAX_ATTEMPTS_IP) {
          await logAttempt(email, false, 'BLOQUEADO_POR_IP', ip, userAgent);
          throw new Error('Demasiados intentos fallidos desde esta red. Espera 15 minutos.');
        }

        const [user] = await db
          .select()
          .from(users)
          .where(and(eq(users.email, email), isNull(users.deletedAt)))
          .limit(1);

        // Mensaje idéntico exista o no el usuario: no revelamos qué correos están registrados.
        if (!user?.passwordHash || !user.activo) {
          await logAttempt(email, false, 'CREDENCIALES_INVALIDAS', ip, userAgent);
          return null;
        }

        if (!(await verifyPassword(user.passwordHash, parsed.data.password))) {
          await logAttempt(email, false, 'CREDENCIALES_INVALIDAS', ip, userAgent);
          return null;
        }

        const profile = await loadSessionProfile(user.id);
        if (!profile) {
          await logAttempt(email, false, 'PERFIL_NO_DISPONIBLE', ip, userAgent);
          return null;
        }

        await logAttempt(email, true, undefined, ip, userAgent);
        await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

        return { ...profile, email: profile.email, name: profile.nombre };
      },
    }),
  ],
});

/** Sesión garantizada o excepción. Úsala en Server Components y Server Actions. */
export async function requireSession() {
  const session = await auth();
  if (!session?.user) {
    throw new Error('NO_AUTENTICADO');
  }
  return session;
}
