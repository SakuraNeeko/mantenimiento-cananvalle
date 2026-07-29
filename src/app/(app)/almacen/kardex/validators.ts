import { z } from 'zod';

const decimalPositivo = z
  .string()
  .trim()
  .min(1, 'Obligatorio.')
  .refine((v) => /^\d+(\.\d+)?$/.test(v) && Number(v) > 0, 'Debe ser un número mayor que cero.');

const decimalNoNegativo = z
  .string()
  .trim()
  .refine((v) => v === '' || (/^\d+(\.\d+)?$/.test(v) && Number(v) >= 0), 'Debe ser un número.');

export const lineaMovimientoSchema = z.object({
  materialId: z.string().uuid('Selecciona un material.'),
  cantidad: decimalPositivo,
  costoUnitario: decimalNoNegativo,
  lote: z.string().trim().optional(),
  serie: z.string().trim().optional(),
  fechaVencimiento: z.string().trim().optional(),
});

export const movimientoSchema = z.object({
  warehouseId: z.string().uuid('Selecciona un almacén.'),
  kardexConceptId: z.string().uuid('Selecciona un concepto.'),
  partyId: z.string().trim().optional(),
  documentoSoporte: z.string().trim().max(200).optional(),
  fecha: z.string().trim().optional(),
  lineas: z.array(lineaMovimientoSchema).min(1, 'Agrega al menos una línea.'),
});

export type LineaMovimientoInput = z.infer<typeof lineaMovimientoSchema>;
export type MovimientoInput = z.infer<typeof movimientoSchema>;
