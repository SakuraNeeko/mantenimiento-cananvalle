import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth/config';

/**
 * Middleware edge: solo comprueba que exista sesión.
 * La verificación de PERMISOS nunca ocurre aquí — vive en el servidor,
 * dentro de cada Server Action y ruta de API (`requirePermission`).
 */
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.png$).*)'],
};
