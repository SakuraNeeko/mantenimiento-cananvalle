import type { CampoDefPublico } from '@/lib/catalogs/registry';
import { TIPO_MATERIAL_LABELS } from '@/lib/validators/material';

export const MATERIAL_IMPORT_CAMPOS: CampoDefPublico[] = [
  { name: 'codigo', label: 'Código', tipo: 'texto', requerido: true },
  { name: 'nombre', label: 'Nombre', tipo: 'texto', requerido: true },
  { name: 'descripcion', label: 'Descripción', tipo: 'textarea' },
  {
    name: 'tipo',
    label: 'Tipo',
    tipo: 'enum',
    requerido: true,
    opciones: Object.entries(TIPO_MATERIAL_LABELS).map(([value, label]) => ({ value, label })),
  },
  { name: 'uomId', label: 'Unidad de medida', tipo: 'referencia' },
  { name: 'categoria', label: 'Categoría', tipo: 'texto' },
  { name: 'critico', label: 'Crítico', tipo: 'booleano' },
  { name: 'manejaLote', label: 'Maneja lote', tipo: 'booleano' },
  { name: 'manejaSerie', label: 'Maneja serie', tipo: 'booleano' },
  { name: 'activo', label: 'Activo', tipo: 'booleano' },
];
