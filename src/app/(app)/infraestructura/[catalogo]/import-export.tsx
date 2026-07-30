'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { Download, Loader2, Upload } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { ColumnFilter } from '@/components/data-table/types';
import type { CatalogoDefPublico } from '@/lib/catalogs/registry';
import { mapearFilaExcel } from '@/lib/catalogs/excel-mapping';
import { exportarFilas, importarFilas, type ResultadoImportacion } from './actions';

type ResultadoOk = Extract<ResultadoImportacion, { ok: true }>;

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
  const router = useRouter();
  const [exportando, setExportando] = React.useState(false);
  const [importando, setImportando] = React.useState(false);
  const [resultado, setResultado] = React.useState<ResultadoOk | null>(null);

  async function exportar() {
    setExportando(true);
    try {
      const { headers, rows } = await exportarFilas(slug, filtros, search);
      const hoja = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const libro = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(libro, hoja, def.titulo.slice(0, 31));
      XLSX.writeFile(libro, `${slug}.xlsx`);
    } catch {
      toast.error('No se pudo exportar el catálogo.');
    } finally {
      setExportando(false);
    }
  }

  async function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setImportando(true);
    try {
      const buffer = await file.arrayBuffer();
      const libro = XLSX.read(buffer, { cellDates: true });
      const nombreHoja = libro.SheetNames[0];
      const hoja = nombreHoja ? libro.Sheets[nombreHoja] : undefined;
      if (!hoja) throw new Error('El archivo no tiene hojas.');

      const filasCrudas = XLSX.utils.sheet_to_json<Record<string, unknown>>(hoja, { defval: '' });
      const filasMapeadas = filasCrudas.map((f) => mapearFilaExcel(def, f));

      const resultado = await importarFilas(slug, filasMapeadas, file.name);
      if (!resultado.ok) {
        toast.error(resultado.error);
        return;
      }
      setResultado(resultado);
      if (resultado.filasOk > 0) router.refresh();
    } catch {
      toast.error('No se pudo leer el archivo. Verifica que sea un .xlsx válido.');
    } finally {
      setImportando(false);
    }
  }

  return (
    <>
      {puedeExportar ? (
        <Button variant="outline" size="icon" aria-label="Exportar a Excel" title="Exportar a Excel" onClick={exportar} disabled={exportando}>
          {exportando ? <Loader2 className="animate-spin" aria-hidden /> : <Download aria-hidden />}
        </Button>
      ) : null}

      {puedeImportar ? (
        <label
          className={cn(buttonVariants({ variant: 'outline', size: 'icon' }), 'cursor-pointer', importando && 'pointer-events-none opacity-50')}
          title="Importar desde Excel"
          aria-label="Importar desde Excel"
        >
          {importando ? <Loader2 className="animate-spin" aria-hidden /> : <Upload aria-hidden />}
          <input type="file" accept=".xlsx,.xls" className="hidden" onChange={onFileSelected} disabled={importando} />
        </label>
      ) : null}

      <Dialog open={Boolean(resultado)} onOpenChange={(o) => !o && setResultado(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resultado de la importación</DialogTitle>
          </DialogHeader>
          {resultado ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant="success">{resultado.filasOk} correctas</Badge>
                {resultado.filasError > 0 ? <Badge variant="destructive">{resultado.filasError} con error</Badge> : null}
                <Badge variant="neutral">{resultado.total} en total</Badge>
              </div>
              {resultado.errores.length > 0 ? (
                <div className="max-h-64 overflow-auto rounded-[6px] border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Fila</TableHead>
                        <TableHead>Error</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {resultado.errores.map((e) => (
                        <TableRow key={e.fila}>
                          <TableCell className="tabular">{e.fila}</TableCell>
                          <TableCell className="text-xs">{e.error}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : null}
            </div>
          ) : null}
          <DialogFooter>
            <Button onClick={() => setResultado(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
