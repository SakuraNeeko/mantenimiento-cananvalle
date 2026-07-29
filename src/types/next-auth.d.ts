import type { DefaultSession } from 'next-auth';
import type { Scope } from '@/db/schema';

declare module 'next-auth' {
  interface User {
    id?: string;
    tenantId: string;
    nombre: string;
    permissions: string[];
    roles: string[];
    scope: Scope;
    siteIds: string[];
    siteDefaultId: string | null;
    tokenVersion: number;
  }

  interface Session {
    user: {
      id: string;
      tenantId: string;
      nombre: string;
      permissions: string[];
      roles: string[];
      scope: Scope;
      siteIds: string[];
      siteDefaultId: string | null;
      tokenVersion: number;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    tenantId: string;
    nombre: string;
    permissions: string[];
    roles: string[];
    scope: Scope;
    siteIds: string[];
    siteDefaultId: string | null;
    tokenVersion: number;
  }
}
