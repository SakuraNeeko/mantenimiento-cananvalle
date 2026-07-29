import { z } from 'zod';

const PRIORIDADES = ['BAJA', 'MEDIA', 'ALTA', 'URGENTE'] as const;

export const PRIORIDAD_LABELS: Record<(typeof PRIORIDADES)[number], string> = {
  BAJA: 'Baja',
  MEDIA: 'Media',
  ALTA: 'Alta',
  URGENTE: 'Urgente',
};

export const ESTADO_LABELS: Record<string, string> = {
  BORRADOR: 'Borrador',
  ENVIADA: 'Enviada',
  EN_REVISION: 'En revisión',
  APROBADA: 'Aprobada',
  RECHAZADA: 'Rechazada',
  ASIGNADA: 'Asignada',
  EN_ATENCION: 'En atención',
  RESUELTA: 'Resuelta',
  CERRADA: 'Cerrada',
  CONVERTIDA_EN_OT: 'Convertida en OT',
};

const campoOpcional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined));

export const solicitudBaseSchema = z.object({
  descripcion: z.string().trim().min(5, 'Describe el problema con un poco más de detalle.').max(2000),
  prioridad: z.enum(PRIORIDADES),
  assetId: campoOpcional,
  locationId: campoOpcional,
  siteId: campoOpcional,
  workTypeId: campoOpcional,
});

export type SolicitudFormValues = z.infer<typeof solicitudBaseSchema> & { id?: string };
