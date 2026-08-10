import { z } from 'zod';

export const ESTADO_LABELS: Record<string, string> = {
  ABIERTO: 'Abierto',
  CERRADO: 'Cerrado',
};

export const ESTADO_VARIANT: Record<string, 'success' | 'warning' | 'destructive' | 'neutral'> = {
  ABIERTO: 'warning',
  CERRADO: 'success',
};

const campoOpcional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined));

export const salidaBaseSchema = z.object({
  assetId: z.string().trim().min(1, 'Selecciona el activo.'),
  responsableUserId: z.string().trim().min(1, 'Selecciona el responsable.'),
  proposito: z.string().trim().min(3, 'Indica el propósito del uso.').max(300),
  lecturaSalida: campoOpcional,
  observaciones: campoOpcional,
});

export type SalidaFormValues = z.infer<typeof salidaBaseSchema>;

export const regresoBaseSchema = z.object({
  lecturaRegreso: campoOpcional,
  observaciones: campoOpcional,
});

export type RegresoFormValues = z.infer<typeof regresoBaseSchema>;
