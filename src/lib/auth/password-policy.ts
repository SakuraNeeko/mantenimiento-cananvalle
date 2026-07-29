/**
 * Política de contraseñas, aislada de `password.ts` a propósito: este módulo
 * es JS puro (sin `@node-rs/argon2`, un binario nativo) para poder importarse
 * también desde componentes cliente, p. ej. el validador Zod del formulario
 * de usuarios comparte esta misma regla con el servidor.
 */

export type PasswordPolicy = {
  minLength: number;
  requireSymbol: boolean;
};

export const DEFAULT_POLICY: PasswordPolicy = { minLength: 10, requireSymbol: true };

/** Devuelve la lista de incumplimientos; vacía = la clave es válida. */
export function checkPasswordPolicy(plain: string, policy: PasswordPolicy = DEFAULT_POLICY): string[] {
  const errors: string[] = [];
  if (plain.length < policy.minLength) errors.push(`Debe tener al menos ${policy.minLength} caracteres.`);
  if (!/[a-z]/.test(plain)) errors.push('Debe incluir al menos una minúscula.');
  if (!/[A-Z]/.test(plain)) errors.push('Debe incluir al menos una mayúscula.');
  if (!/\d/.test(plain)) errors.push('Debe incluir al menos un número.');
  if (policy.requireSymbol && !/[^A-Za-z0-9]/.test(plain)) errors.push('Debe incluir al menos un símbolo.');
  return errors;
}
