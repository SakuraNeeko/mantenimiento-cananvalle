import type { NextAuthConfig, Session, User } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { users } from '@/db/schema';

/**
 * Configuración EDGE-SAFE: sin argon2 (binario nativo) ni transacciones.
 * La usa `middleware.ts`. El proveedor Credentials se añade en `index.ts`,
 * que corre en runtime Node.
 *
 * La única lectura permitida aquí es la comparación de `tokenVersion` del
 * callback `jwt`, hecha con `db` (driver HTTP de neon-serverless, basado en
 * `fetch` y por tanto compatible con edge). Nunca se usa `dbTx` en este archivo.
 */
export const authConfig = {
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    // Expiración por inactividad; se refresca en cada request autenticada.
    maxAge: 60 * 60 * 12,
    updateAge: 60 * 15,
  },
  trustHost: true,
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = Boolean(auth?.user);
      const { pathname } = request.nextUrl;
      const isPublic =
        pathname.startsWith('/login') ||
        pathname.startsWith('/recuperar-clave') ||
        pathname.startsWith('/api/auth');
      if (isPublic) return true;
      return isLoggedIn;
    },
    async jwt({ token, user }: { token: JWT; user?: User }) {
      if (user) {
        token.id = user.id as string;
        token.tenantId = user.tenantId;
        token.nombre = user.nombre;
        token.permissions = user.permissions;
        token.roles = user.roles;
        token.scope = user.scope;
        token.siteIds = user.siteIds;
        token.siteDefaultId = user.siteDefaultId;
        token.tokenVersion = user.tokenVersion;
        return token;
      }

      /**
       * D-07 cerrado: si alguien invalida las sesiones de este usuario
       * (POST /api/usuarios/[id]/invalidar-sesiones) o cambia su contraseña,
       * `users.token_version` avanza y todo JWT emitido antes deja de ser
       * válido en el siguiente request, sin esperar a que caduque (12 h).
       */
      if (!token.id) return null;

      const [row] = await db
        .select({ tokenVersion: users.tokenVersion, activo: users.activo })
        .from(users)
        .where(eq(users.id, token.id))
        .limit(1);

      if (!row || !row.activo || row.tokenVersion !== token.tokenVersion) {
        return null;
      }

      return token;
    },
    session({ session, token }: { session: Session; token: JWT }) {
      session.user.id = token.id;
      session.user.tenantId = token.tenantId;
      session.user.nombre = token.nombre;
      session.user.permissions = token.permissions;
      session.user.roles = token.roles;
      session.user.scope = token.scope;
      session.user.siteIds = token.siteIds;
      session.user.siteDefaultId = token.siteDefaultId;
      session.user.tokenVersion = token.tokenVersion;
      return session;
    },
  },
} satisfies NextAuthConfig;
