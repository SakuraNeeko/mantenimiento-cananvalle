import { z } from 'zod';

const PRIORIDADES = ['BAJA', 'MEDIA', 'ALTA', 'URGENTE'] as const;
const CRITICIDADES = ['A', 'B', 'C'] as const;

export const PRIORIDAD_LABELS: Record<(typeof PRIORIDADES)[number], string> = {
  BAJA: 'Baja',
  MEDIA: 'Media',
  ALTA: 'Alta',
  URGENTE: 'Urgente',
};

export const ESTADO_LABELS: Record<string, string> = {
  BORRADOR: 'Borrador',
  PLANIFICADA: 'Planificada',
  ASIGNADA: 'Asignada',
  EN_EJECUCION: 'En ejecución',
  PENDIENTE: 'Pendiente',
  EJECUTADA: 'Ejecutada',
  LIQUIDADA: 'Liquidada',
  CERRADA: 'Cerrada',
  EN_HISTORIA: 'En historia',
  CANCELADA: 'Cancelada',
};

export const ESTADO_VARIANT: Record<string, 'success' | 'warning' | 'destructive' | 'info' | 'neutral'> = {
  BORRADOR: 'neutral',
  PLANIFICADA: 'info',
  ASIGNADA: 'info',
  EN_EJECUCION: 'warning',
  PENDIENTE: 'destructive',
  EJECUTADA: 'success',
  LIQUIDADA: 'success',
  CERRADA: 'neutral',
  EN_HISTORIA: 'neutral',
  CANCELADA: 'destructive',
};

const campoOpcional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined));

export const ordenBaseSchema = z.object({
  descripcionProblema: z.string().trim().min(5, 'Describe el problema con más detalle.').max(2000),
  prioridad: z.enum(PRIORIDADES),
  criticidad: z.enum(CRITICIDADES),
  assetId: campoOpcional,
  locationId: campoOpcional,
  costCenterId: campoOpcional,
  responsibleCenterId: campoOpcional,
  maintenanceTypeId: campoOpcional,
  workTypeId: campoOpcional,
  causaFallaId: campoOpcional,
  efectoFallaId: campoOpcional,
  technicalActionId: campoOpcional,
  requiereParo: z.boolean(),
  permisoTrabajoRequerido: z.boolean(),
  tiempoEstimadoHoras: campoOpcional,
});

export type OrdenFormValues = z.infer<typeof ordenBaseSchema> & { id?: string };
