import { z } from 'zod';

const ALCANCES = ['ACTIVO_UNICO', 'GRUPO'] as const;
const PRIORIDADES = ['BAJA', 'MEDIA', 'ALTA', 'URGENTE'] as const;

export const ALCANCE_LABELS: Record<(typeof ALCANCES)[number], string> = {
  ACTIVO_UNICO: 'Un solo activo',
  GRUPO: 'Grupo de activos (por filtros)',
};

export const PRIORIDAD_LABELS: Record<(typeof PRIORIDADES)[number], string> = {
  BAJA: 'Baja',
  MEDIA: 'Media',
  ALTA: 'Alta',
  URGENTE: 'Urgente',
};

export const CLASE_LABELS = {
  EQUIPO: 'Equipo',
  VEHICULO: 'Vehículo',
  INFRAESTRUCTURA: 'Infraestructura',
  TI: 'TI',
  BIOMEDICO: 'Biomédico',
  HERRAMIENTA: 'Herramienta',
} as const;

const campoOpcional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined));

export const planBaseSchema = z
  .object({
    codigo: z.string().trim().min(1, 'El código es obligatorio.').max(30),
    nombre: z.string().trim().min(3, 'El nombre debe tener al menos 3 caracteres.').max(200),
    maintenanceTypeId: campoOpcional,
    workTypeId: campoOpcional,
    alcance: z.enum(ALCANCES),
    assetId: campoOpcional,
    claseFiltro: campoOpcional,
    criticidadFiltro: campoOpcional,
    locationFiltro: campoOpcional,
    responsibleDefaultId: campoOpcional,
    prioridad: z.enum(PRIORIDADES),
    tiempoEstimadoHoras: campoOpcional,
    instrucciones: campoOpcional,
  })
  .refine((v) => v.alcance !== 'ACTIVO_UNICO' || Boolean(v.assetId), {
    message: 'Selecciona el activo para un plan de alcance "un solo activo".',
    path: ['assetId'],
  });

export type PlanFormValues = z.infer<typeof planBaseSchema> & { id?: string };

const TIPOS_TRIGGER = ['CALENDARIO', 'CONTADOR', 'CONDICION', 'EVENTO'] as const;
const UNIDADES_INTERVALO = ['DIAS', 'SEMANAS', 'MESES', 'ANIOS'] as const;
const MODOS_REPROGRAMACION = ['FIJO', 'FLOTANTE'] as const;

export const TRIGGER_TIPO_LABELS: Record<(typeof TIPOS_TRIGGER)[number], string> = {
  CALENDARIO: 'Calendario',
  CONTADOR: 'Contador (medidor)',
  CONDICION: 'Condición',
  EVENTO: 'Evento',
};

export const UNIDAD_INTERVALO_LABELS: Record<(typeof UNIDADES_INTERVALO)[number], string> = {
  DIAS: 'días',
  SEMANAS: 'semanas',
  MESES: 'meses',
  ANIOS: 'años',
};

export const MODO_REPROGRAMACION_LABELS: Record<(typeof MODOS_REPROGRAMACION)[number], string> = {
  FIJO: 'Fijo (desde la fecha teórica)',
  FLOTANTE: 'Flotante (desde la fecha real de ejecución)',
};

export const triggerBaseSchema = z
  .object({
    tipo: z.enum(TIPOS_TRIGGER),
    modoReprogramacion: z.enum(MODOS_REPROGRAMACION),
    diasAnticipacion: z.coerce.number().int().min(0).default(0),
    intervaloValor: campoOpcional,
    intervaloUnidad: z.enum(UNIDADES_INTERVALO).optional(),
    fechaBase: campoOpcional,
    meterId: campoOpcional,
    intervaloContador: campoOpcional,
    umbralAviso: campoOpcional,
  })
  .refine((v) => v.tipo !== 'CALENDARIO' || (v.intervaloValor && v.intervaloUnidad && v.fechaBase), {
    message: 'Un disparador de calendario necesita intervalo, unidad y fecha base.',
    path: ['intervaloValor'],
  })
  .refine((v) => v.tipo !== 'CONTADOR' || (v.meterId && v.intervaloContador), {
    message: 'Un disparador de contador necesita el medidor y el intervalo.',
    path: ['meterId'],
  });

export type TriggerFormValues = z.infer<typeof triggerBaseSchema>;
