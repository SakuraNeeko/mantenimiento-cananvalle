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

/** Valor centinela del selector "Destino" cuando el lugar no es ninguna de las fincas del sistema. */
export const DESTINO_OTRO = 'OTRO';

export const salidaBaseSchema = z
  .object({
    assetId: z.string().trim().min(1, 'Selecciona el activo.'),
    responsableId: z.string().trim().min(1, 'Selecciona el responsable.'),
    origenSiteId: z.string().trim().min(1, 'Selecciona la finca de origen.'),
    destino: z.string().trim().min(1, 'Selecciona el destino.'),
    destinoOtro: campoOpcional,
    proposito: z.string().trim().min(3, 'Indica el propósito del uso.').max(300),
    lecturaSalida: campoOpcional,
    observaciones: campoOpcional,
  })
  .refine((v) => v.destino !== DESTINO_OTRO || Boolean(v.destinoOtro), {
    message: 'Especifica el destino.',
    path: ['destinoOtro'],
  });

export type SalidaFormValues = z.infer<typeof salidaBaseSchema>;

export const regresoBaseSchema = z.object({
  llegadaSiteId: z.string().trim().min(1, 'Selecciona la finca de llegada.'),
  lecturaRegreso: campoOpcional,
  observaciones: campoOpcional,
});

export type RegresoFormValues = z.infer<typeof regresoBaseSchema>;
