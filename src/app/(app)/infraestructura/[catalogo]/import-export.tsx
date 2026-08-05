'use client';

import { ImportDialog } from '@/components/excel/import-dialog';
import type { ColumnFilter } from '@/components/data-table/types';
import type { CatalogoDefPublico } from '@/lib/catalogs/registry';
import { exportarFilas, importarFilas, previsualizarImportacion } from './actions';

export function ImportExportBar({
  slug,
  def,
  filtros,
  search,
  puedeExportar,
  puedeImportar,
}: {
  slug: string;
  def: CatalogoDefPublico;
  filtros: ColumnFilter[];
  search: string;
  puedeExportar: boolean;
  puedeImportar: boolean;
}) {
  return (
    <ImportDialog
      campos={def.campos}
      nombreArchivo={slug}
      tituloHoja={def.titulo}
      puedeExportar={puedeExportar}
      puedeImportar={puedeImportar}
      onExportar={() => exportarFilas(slug, filtros, search)}
      onPrevisualizar={(filas) => previsualizarImportacion(slug, filas)}
      onConfirmar={(filas, archivoNombre) => importarFilas(slug, filas, archivoNombre)}
    />
  );
}
