import { z } from 'zod';

const TIPOS = ['PROGRAMADO', 'NO_PROGRAMADO'] as const;

export const TIPO_LABELS: Record<(typeof TIPOS)[number], string> = {
  PROGRAMADO: 'Programado',
  NO_PROGRAMADO: 'No programado',
};

export const ESTADO_LABELS: Record<string, string> = {
  ABIERTO: 'Abierto',
  CERRADO: 'Cerrado',
};

export const ESTADO_VARIANT: Record<string, 'success' | 'warning' | 'destructive' | 'info' | 'neutral'> = {
  ABIERTO: 'warning',
  CERRADO: 'success',
};

const campoOpcional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined));

export const paroBaseSchema = z.object({
  assetId: z.string().trim().min(1, 'Selecciona el activo.'),
  tipo: z.enum(TIPOS),
  fechaInicio: z.string().trim().min(1, 'Indica la fecha y hora de inicio.'),
  causaFallaId: campoOpcional,
  efectoFallaId: campoOpcional,
  technicalActionId: campoOpcional,
  observaciones: campoOpcional,
});

export type ParoFormValues = z.infer<typeof paroBaseSchema>;

export const cierreParoSchema = z.object({
  fechaFin: z.string().trim().min(1, 'Indica la fecha y hora de fin.'),
  causaFallaId: campoOpcional,
  efectoFallaId: campoOpcional,
  technicalActionId: campoOpcional,
  impactoUnidadesNoProducidas: campoOpcional,
  impactoCostoEstimado: campoOpcional,
});

export type CierreParoValues = z.infer<typeof cierreParoSchema>;
