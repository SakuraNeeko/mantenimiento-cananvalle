'use client';

import { ImportDialog } from '@/components/excel/import-dialog';
import type { ColumnFilter } from '@/components/data-table/types';
import { exportarMateriales, importarMaterialesFilas, previsualizarImportacionMateriales } from './actions';
import { MATERIAL_IMPORT_CAMPOS } from './import-campos';

export function MaterialesImportExport({
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
      campos={MATERIAL_IMPORT_CAMPOS}
      nombreArchivo="materiales"
      tituloHoja="Materiales"
      puedeExportar={puedeExportar}
      puedeImportar={puedeImportar}
      onExportar={() => exportarMateriales(filtros, search)}
      onPrevisualizar={(filas) => previsualizarImportacionMateriales(filas)}
      onConfirmar={(filas, archivoNombre) => importarMaterialesFilas(filas, archivoNombre)}
    />
  );
}
