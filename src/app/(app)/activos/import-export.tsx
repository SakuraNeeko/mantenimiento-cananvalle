'use client';

import { ImportDialog } from '@/components/excel/import-dialog';
import type { ColumnFilter } from '@/components/data-table/types';
import { exportarActivos, importarActivosFilas, previsualizarImportacionActivos } from './actions';
import { ACTIVO_IMPORT_CAMPOS } from './import-campos';

export function ActivosImportExport({
  filtros,
  search,
  puedeExportar,
  puedeImportar,
}: {
  filtros: ColumnFilter[];
  search: string;
  puedeExportar: boolean;
  puedeImportar: boolean;
}) {
  return (
    <ImportDialog
      campos={ACTIVO_IMPORT_CAMPOS}
      nombreArchivo="activos"
      tituloHoja="Activos"
      puedeExportar={puedeExportar}
      puedeImportar={puedeImportar}
      onExportar={() => exportarActivos(filtros, search)}
      onPrevisualizar={(filas) => previsualizarImportacionActivos(filas)}
      onConfirmar={(filas, archivoNombre) => importarActivosFilas(filas, archivoNombre)}
    />
  );
}
