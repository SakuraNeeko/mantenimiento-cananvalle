import { z } from 'zod';
import { checkPasswordPolicy } from '@/lib/auth/password-policy';

/**
 * Esquema compartido entre el formulario cliente (react-hook-form + zodResolver)
 * y los Server Actions de `administracion/usuarios/actions.ts`. Una sola fuente
 * de verdad para las reglas de validación.
 */

const passwordFuerte = z.string().superRefine((valor, ctx) => {
  for (const mensaje of checkPasswordPolicy(valor)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: mensaje });
  }
});

const campoOpcional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined));

const camposComunes = {
  nombre: z.string().trim().min(2, 'Ingresa el nombre completo.').max(120),
  email: z.string().trim().toLowerCase().min(1, 'El correo es obligatorio.').email('Correo no válido.'),
  cargo: campoOpcional,
  telefono: campoOpcional,
  siteDefaultId: campoOpcional,
  activo: z.boolean(),
  roleIds: z.array(z.string().uuid()),
  siteIds: z.array(z.string().uuid()),
};

const sedeDefaultDentroDelAcceso = (v: { siteDefaultId?: string; siteIds: string[] }) =>
  !v.siteDefaultId || v.siteIds.length === 0 || v.siteIds.includes(v.siteDefaultId);

const MENSAJE_SEDE_DEFAULT = { message: 'La sede por defecto debe ser una de las sedes con acceso.', path: ['siteDefaultId'] };

/**
 * Esquema fuerte para creación: la contraseña es obligatoria.
 * Lo aplica el Server Action `crearUsuario` — la última palabra sobre validación.
 */
export const crearUsuarioSchema = z
  .object({ ...camposComunes, password: passwordFuerte })
  .refine(sedeDefaultDentroDelAcceso, MENSAJE_SEDE_DEFAULT);

/**
 * Esquema fuerte para edición: contraseña vacía = no cambiarla.
 * Lo aplica el Server Action `actualizarUsuario`.
 */
export const actualizarUsuarioSchema = z
  .object({
    ...camposComunes,
    id: z.string().uuid(),
    password: z.union([passwordFuerte, z.literal('')]),
  })
  .refine(sedeDefaultDentroDelAcceso, MENSAJE_SEDE_DEFAULT);

/**
 * Esquema único que usa el formulario (crear y editar comparten el mismo
 * componente). La contraseña siempre admite vacío aquí: en modo creación,
 * `UsuarioForm` la exige a mano antes de enviar, para no bifurcar el tipo
 * del formulario según el modo — el servidor vuelve a exigirla con
 * `crearUsuarioSchema`, que es quien manda.
 */
export const usuarioFormSchema = z
  .object({ ...camposComunes, id: z.string().uuid().optional(), password: z.union([passwordFuerte, z.literal('')]) })
  .refine(sedeDefaultDentroDelAcceso, MENSAJE_SEDE_DEFAULT);

export type CrearUsuarioInput = z.infer<typeof crearUsuarioSchema>;
export type ActualizarUsuarioInput = z.infer<typeof actualizarUsuarioSchema>;
export type UsuarioFormValues = z.infer<typeof usuarioFormSchema>;
