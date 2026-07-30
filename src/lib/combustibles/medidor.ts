export type TipoLecturaMedidor = 'HOROMETRO' | 'ODOMETRO' | 'CICLOS' | 'M3' | 'OTRO';

/** Unidad por defecto de cada tipo de lectura, usada cuando el medidor no tiene una UOM propia asignada. */
const UNIDAD_POR_DEFECTO: Record<TipoLecturaMedidor, string> = {
  HOROMETRO: 'h',
  ODOMETRO: 'km',
  CICLOS: 'ciclos',
  M3: 'm³',
  OTRO: '',
};

const ETIQUETA_CAMPO: Record<TipoLecturaMedidor, string> = {
  HOROMETRO: 'Lectura de horómetro',
  ODOMETRO: 'Lectura de odómetro',
  CICLOS: 'Lectura de ciclos',
  M3: 'Lectura',
  OTRO: 'Lectura',
};

/** Unidad a mostrar: prioriza la UOM del catálogo si el medidor tiene una asignada. */
export function unidadLectura(tipoLectura: TipoLecturaMedidor | null, simboloUom: string | null): string {
  if (simboloUom) return simboloUom;
  return UNIDAD_POR_DEFECTO[tipoLectura ?? 'OTRO'];
}

/** Etiqueta completa para el campo "Lectura" del formulario de combustible. */
export function etiquetaCampoLectura(tipoLectura: TipoLecturaMedidor | null, simboloUom: string | null): string {
  if (!tipoLectura) return 'Lectura de odómetro / horómetro';
  const unidad = unidadLectura(tipoLectura, simboloUom);
  return unidad ? `${ETIQUETA_CAMPO[tipoLectura]} (${unidad})` : ETIQUETA_CAMPO[tipoLectura];
}
