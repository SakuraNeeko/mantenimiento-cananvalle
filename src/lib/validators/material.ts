import { z } from 'zod';

const TIPOS = ['REPUESTO', 'INSUMO', 'HERRAMIENTA', 'EPP'] as const;

export const TIPO_MATERIAL_LABELS: Record<(typeof TIPOS)[number], string> = {
  REPUESTO: 'Repuesto',
  INSUMO: 'Insumo',
  HERRAMIENTA: 'Herramienta',
  EPP: 'EPP',
};

const campoOpcional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined));

export const materialBaseSchema = z.object({
  codigo: z.string().trim().min(1, 'El código es obligatorio.').max(60),
  nombre: z.string().trim().min(2, 'Ingresa un nombre.').max(200),
  descripcion: campoOpcional,
  tipo: z.enum(TIPOS),
  uomId: campoOpcional,
  categoria: campoOpcional,
  critico: z.boolean(),
  manejaLote: z.boolean(),
  manejaSerie: z.boolean(),
  activo: z.boolean(),
});

export const crearMaterialSchema = materialBaseSchema;
export const actualizarMaterialSchema = materialBaseSchema.extend({ id: z.string().uuid() });

export type CrearMaterialInput = z.infer<typeof crearMaterialSchema>;
export type ActualizarMaterialInput = z.infer<typeof actualizarMaterialSchema>;
export type MaterialFormValues = z.infer<typeof materialBaseSchema> & { id?: string };
