'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { Download, FileSpreadsheet, Loader2, Upload } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { CampoDefPublico } from '@/lib/catalogs/registry';
import { mapearFilaExcel } from '@/lib/catalogs/excel-mapping';
import { aplicarFormatoHoja } from '@/lib/excel/hoja-con-formato';

export type FilaExportada = (string | number | Date)[];

export type FilaPreview = {
  fila: number;
  estado: 'CREAR' | 'ACTUALIZAR' | 'ERROR';
  codigo?: string;
  nombre?: string;
  error?: string;
};

export type ResultadoImportacion =
  | { ok: true; jobId: string; total: number; filasOk: number; filasError: number; errores: { fila: number; error: string }[] }
  | { ok: false; error: string };

const ESTADO_VARIANT = { CREAR: 'success', ACTUALIZAR: 'neutral', ERROR: 'destructive' } as const;
const ESTADO_LABEL = { CREAR: 'Crear', ACTUALIZAR: 'Actualizar', ERROR: 'Error' } as const;

/**
 * Diálogo genérico de importar/exportar/plantilla por Excel, reutilizado por
 * Infraestructura, Activos y Materiales — así evitamos tres UIs casi
 * idénticas. El flujo siempre es: parsear en cliente → previsualizar en el
 * servidor (sin escribir) → el usuario confirma → recién ahí se escribe.
 */
export function ImportDialog({
  campos,
  nombreArchivo,
  tituloHoja,
  puedeExportar,
  puedeImportar,
  onExportar,
  onPrevisualizar,
  onConfirmar,
}: {
  campos: CampoDefPublico[];
  nombreArchivo: string;
  tituloHoja: string;
  puedeExportar: boolean;
  puedeImportar: boolean;
  onExportar?: () => Promise<{ headers: string[]; rows: FilaExportada[] }>;
  onPrevisualizar: (filas: Record<string, unknown>[]) => Promise<FilaPreview[]>;
  onConfirmar: (filas: Record<string, unknown>[], archivoNombre: string) => Promise<ResultadoImportacion>;
}) {
  const router = useRouter();
  const [exportando, setExportando] = React.useState(false);
  const [cargando, setCargando] = React.useState(false);
  const [confirmando, setConfirmando] = React.useState(false);
  const [preview, setPreview] = React.useState<FilaPreview[] | null>(null);
  const [filasPendientes, setFilasPendientes] = React.useState<Record<string, unknown>[] | null>(null);
  const [archivoNombre, setArchivoNombre] = React.useState('');
  const [resultado, setResultado] = React.useState<Extract<ResultadoImportacion, { ok: true }> | null>(null);

  function descargarPlantilla() {
    const headers = campos.map((c) => c.label);
    const hoja = XLSX.utils.aoa_to_sheet([headers]);
    aplicarFormatoHoja(hoja, headers, [], campos.map((c) => c.tipo === 'fecha'));
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, tituloHoja.slice(0, 31));
    XLSX.writeFile(libro, `plantilla-${nombreArchivo}.xlsx`);
  }

  async function exportar() {
    if (!onExportar) return;
    setExportando(true);
    try {
      const { headers, rows } = await onExportar();
      const hoja = XLSX.utils.aoa_to_sheet([headers, ...rows], { cellDates: true });
      aplicarFormatoHoja(hoja, headers, rows, campos.map((c) => c.tipo === 'fecha'));
      const libro = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(libro, hoja, tituloHoja.slice(0, 31));
      XLSX.writeFile(libro, `${nombreArchivo}.xlsx`);
    } catch {
      toast.error('No se pudo exportar.');
    } finally {
      setExportando(false);
    }
  }

  async function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setCargando(true);
    try {
      const buffer = await file.arrayBuffer();
      const libro = XLSX.read(buffer, { cellDates: true });
      const nombreHoja = libro.SheetNames[0];
      const hoja = nombreHoja ? libro.Sheets[nombreHoja] : undefined;
      if (!hoja) throw new Error('El archivo no tiene hojas.');

      const filasCrudas = XLSX.utils.sheet_to_json<Record<string, unknown>>(hoja, { defval: '' });
      const filasMapeadas = filasCrudas.map((f) => mapearFilaExcel({ campos }, f));

      const previsualizacion = await onPrevisualizar(filasMapeadas);
      setPreview(previsualizacion);
      setFilasPendientes(filasMapeadas);
      setArchivoNombre(file.name);
    } catch {
      toast.error('No se pudo leer el archivo. Verifica que sea un .xlsx válido.');
    } finally {
      setCargando(false);
    }
  }

  async function confirmar() {
    if (!filasPendientes) return;
    setConfirmando(true);
    try {
      const resultadoImportacion = await onConfirmar(filasPendientes, archivoNombre);
      if (!resultadoImportacion.ok) {
        toast.error(resultadoImportacion.error);
        return;
      }
      setPreview(null);
      setFilasPendientes(null);
      setResultado(resultadoImportacion);
      if (resultadoImportacion.filasOk > 0) router.refresh();
    } finally {
      setConfirmando(false);
    }
  }

  function cerrarPreview() {
    setPreview(null);
    setFilasPendientes(null);
  }

  const totalCrear = preview?.filter((f) => f.estado === 'CREAR').length ?? 0;
  const totalActualizar = preview?.filter((f) => f.estado === 'ACTUALIZAR').length ?? 0;
  const totalError = preview?.filter((f) => f.estado === 'ERROR').length ?? 0;
  const hayFilasValidas = totalCrear + totalActualizar > 0;

  return (
    <>
      <Button variant="outline" size="icon" aria-label="Descargar plantilla" title="Descargar plantilla" onClick={descargarPlantilla}>
        <FileSpreadsheet aria-hidden />
      </Button>

      {puedeExportar && onExportar ? (
        <Button variant="outline" size="icon" aria-label="Exportar a Excel" title="Exportar a Excel" onClick={exportar} disabled={exportando}>
          {exportando ? <Loader2 className="animate-spin" aria-hidden /> : <Download aria-hidden />}
        </Button>
      ) : null}

      {puedeImportar ? (
        <label
          className={cn(buttonVariants({ variant: 'outline', size: 'icon' }), 'cursor-pointer', cargando && 'pointer-events-none opacity-50')}
          title="Importar desde Excel"
          aria-label="Importar desde Excel"
        >
          {cargando ? <Loader2 className="animate-spin" aria-hidden /> : <Upload aria-hidden />}
          <input type="file" accept=".xlsx,.xls" className="hidden" onChange={onFileSelected} disabled={cargando} />
        </label>
      ) : null}

      <Dialog open={Boolean(preview)} onOpenChange={(o) => !o && cerrarPreview()}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Previsualización de la importación</DialogTitle>
          </DialogHeader>
          {preview ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant="success">{totalCrear} para crear</Badge>
                <Badge variant="neutral">{totalActualizar} para actualizar</Badge>
                {totalError > 0 ? <Badge variant="destructive">{totalError} con error</Badge> : null}
              </div>
              <div className="max-h-80 overflow-auto rounded-[6px] border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Fila</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Detalle</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.map((f) => (
                      <TableRow key={f.fila}>
                        <TableCell className="tabular">{f.fila}</TableCell>
                        <TableCell className="font-codigo text-xs">{f.codigo ?? '—'}</TableCell>
                        <TableCell className="text-xs">{f.nombre ?? '—'}</TableCell>
                        <TableCell>
                          <Badge variant={ESTADO_VARIANT[f.estado]}>{ESTADO_LABEL[f.estado]}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-destructive">{f.error ?? ''}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={cerrarPreview}>
              Cancelar
            </Button>
            <Button onClick={confirmar} disabled={!hayFilasValidas || confirmando} loading={confirmando}>
              Confirmar importación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
