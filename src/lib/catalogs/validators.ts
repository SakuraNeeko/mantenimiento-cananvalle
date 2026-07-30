import { z } from 'zod';
import type { CampoDefPublico, CatalogoDefPublico } from './registry';

/**
 * Forma que maneja el formulario genérico y las Server Actions: un catálogo
 * no se conoce en tiempo de compilación (viene del slug de la URL), así que
 * sus valores viajan como un registro dinámico en vez de un tipo concreto.
 */
export type ValoresDinamicos = Record<string, string | number | boolean | undefined>;

function zodParaCampo(campo: CampoDefPublico): z.ZodTypeAny {
  let base: z.ZodTypeAny;

  switch (campo.tipo) {
    case 'texto':
    case 'textarea':
    case 'fecha':
      base = z.string().trim();
      break;
    case 'referencia':
      base = z.string().uuid('Selecciona una opción válida.');
      break;
    case 'enum':
      base = campo.opciones && campo.opciones.length > 0
        ? z.enum(campo.opciones.map((o) => o.value) as [string, ...string[]])
        : z.string();
      break;
    case 'numero':
      base = z.coerce.number({ invalid_type_error: 'Debe ser un número.' });
      break;
    case 'decimal':
      base = z
        .string()
        .trim()
        .refine((v) => v === '' || /^-?\d+(\.\d+)?$/.test(v), 'Debe ser un número, ej. 12.50.');
      break;
    case 'booleano':
      return z.boolean().default(false);
    default:
      base = z.string();
  }

  if (campo.requerido) {
    if (campo.tipo === 'texto' || campo.tipo === 'decimal') {
      return base.refine((v) => typeof v !== 'string' || v.trim().length > 0, 'Este campo es obligatorio.');
    }
    return base;
  }

  return z.union([base, z.literal('')]).optional();
}

/** Construye el esquema Zod del catálogo a partir de su registro de campos. Una sola fuente de verdad, igual que `validators/usuario.ts`. */
export function buildCatalogoSchema(def: CatalogoDefPublico): z.ZodType<ValoresDinamicos> {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const campo of def.campos) {
    shape[campo.name] = zodParaCampo(campo);
  }
  return z.object(shape) as unknown as z.ZodType<ValoresDinamicos>;
}

/** Valores por defecto de un formulario vacío, para que todos los campos estén controlados desde el inicio. */
export function valoresIniciales(def: CatalogoDefPublico): ValoresDinamicos {
  const valores: ValoresDinamicos = {};
  for (const campo of def.campos) {
    if (campo.tipo === 'booleano') valores[campo.name] = campo.name === 'activo';
    else valores[campo.name] = '';
  }
  return valores;
}
