import { z } from 'zod';

/**
 * Esquema compartido entre `activo-form.tsx` y las Server Actions de
 * `app/(app)/activos/actions.ts`. `estado` queda fuera a propósito: cambia
 * solo por la acción dedicada `cambiarEstadoActivo`, que además escribe en
 * `asset_status_history` — permitir editarlo aquí rompería esa bitácora.
 */

const CRITICIDADES = ['A', 'B', 'C'] as const;

export const ESTADO_LABELS: Record<string, string> = {
  OPERATIVO: 'Operativo',
  EN_MANTENIMIENTO: 'En mantenimiento',
  FUERA_DE_SERVICIO: 'Fuera de servicio',
  DADO_DE_BAJA: 'Dado de baja',
};

const campoOpcional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined));

const decimalOpcional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined))
  .refine((v) => v === undefined || /^-?\d+(\.\d+)?$/.test(v), 'Debe ser un número, ej. 1250.00.');

const enteroOpcional = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => (v === undefined || v === '' ? undefined : Number(v)))
  .refine((v) => v === undefined || Number.isFinite(v), 'Debe ser un número entero.');

export const activoBaseSchema = z.object({
  codigo: z.string().trim().min(1, 'El código es obligatorio.').max(60),
  nombre: z.string().trim().min(2, 'Ingresa un nombre.').max(200),
  claseId: z.string().trim().min(1, 'Selecciona la clase del activo.'),
  criticidad: z.enum(CRITICIDADES),
  parentId: campoOpcional,
  locationId: campoOpcional,
  costCenterId: campoOpcional,
  responsibleCenterId: campoOpcional,
  fabricante: campoOpcional,
  modelo: campoOpcional,
  serie: campoOpcional,
  placa: campoOpcional,
  anio: enteroOpcional,
  fechaCompra: campoOpcional,
  valorCompra: decimalOpcional,
  valorActual: decimalOpcional,
  vidaUtilMeses: enteroOpcional,
  garantiaFin: campoOpcional,
  diasAlertaGarantia: enteroOpcional,
  partyId: campoOpcional,
  contractId: campoOpcional,
  descripcion: campoOpcional,
  activo: z.boolean(),
});

export const crearActivoSchema = activoBaseSchema;
export const actualizarActivoSchema = activoBaseSchema.extend({ id: z.string().uuid() });

export type CrearActivoInput = z.infer<typeof crearActivoSchema>;
export type ActualizarActivoInput = z.infer<typeof actualizarActivoSchema>;
export type ActivoFormValues = z.infer<typeof activoBaseSchema> & { id?: string };
