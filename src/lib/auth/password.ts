import { hash, verify } from '@node-rs/argon2';

/**
 * Argon2id con parámetros conservadores para runtime Node de Vercel.
 * NO importar este módulo desde middleware ni desde componentes cliente:
 * @node-rs/argon2 es un binario nativo y no corre en el runtime edge.
 * La política de contraseñas (JS puro, sí apta para cliente) vive en
 * `password-policy.ts`.
 */
const OPTIONS = {
  memoryCost: 19_456, // 19 MiB — recomendación OWASP 2024
  timeCost: 2,
  outputLen: 32,
  parallelism: 1,
} as const;

export function hashPassword(plain: string): Promise<string> {
  return hash(plain, OPTIONS);
}

export async function verifyPassword(hashed: string, plain: string): Promise<boolean> {
  try {
    return await verify(hashed, plain, OPTIONS);
  } catch {
    return false;
  }
}

export type { PasswordPolicy } from './password-policy';
export { DEFAULT_POLICY, checkPasswordPolicy } from './password-policy';
