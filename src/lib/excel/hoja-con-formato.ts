import * as XLSX from 'xlsx';

/**
 * Aplica a una hoja ya creada con `aoa_to_sheet` los mismos tres retoques en
 * los dos lugares del sistema que exportan a Excel (la tabla genérica y el
 * exportador propio de Infraestructura): ancho de columna según el
 * contenido, autofiltro en el encabezado, y formato de fecha real (no
 * texto) en las columnas marcadas como fecha. La edición gratuita de
 * `xlsx` no permite negrita ni color de celda — eso exige la versión de
 * paga (Pro) de SheetJS.
 */
export function aplicarFormatoHoja(
  hoja: XLSX.WorkSheet,
  headers: string[],
  filas: (string | number | Date)[][],
  columnasFecha: boolean[],
): void {
  hoja['!cols'] = headers.map((h, i) => {
    const anchoDatos = Math.max(0, ...filas.map((f) => String(f[i] ?? '').length));
    return { wch: Math.min(Math.max(h.length, anchoDatos, 8) + 2, 40) };
  });

  if (filas.length > 0) {
    hoja['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: filas.length, c: headers.length - 1 } }) };
  }

  for (let c = 0; c < headers.length; c++) {
    if (!columnasFecha[c]) continue;
    for (let r = 0; r < filas.length; r++) {
      const ref = XLSX.utils.encode_cell({ r: r + 1, c });
      if (hoja[ref] && hoja[ref].t === 'd') hoja[ref].z = 'dd/mm/yyyy';
    }
  }
}
