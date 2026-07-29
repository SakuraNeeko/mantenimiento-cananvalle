'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { FileText, Loader2, Trash2, Upload } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import { fmtDate } from '@/lib/datetime';
import { eliminarDocumento, subirDocumento } from './actions';

const TIPO_LABELS: Record<string, string> = { MANUAL: 'Manual', PLANO: 'Plano', CERTIFICADO: 'Certificado', GARANTIA: 'Garantía', OTRO: 'Otro' };

export type DocumentoRow = {
  id: string;
  tipo: string;
  nombre: string;
  blobUrl: string;
  mimeType: string;
  bytes: number;
  createdAt: Date;
};

function formatearTamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentosPanel({ assetId, documentos, puedeGestionar }: { assetId: string; documentos: DocumentoRow[]; puedeGestionar: boolean }) {
  const router = useRouter();
  const [tipo, setTipo] = React.useState('OTRO');
  const [subiendo, setSubiendo] = React.useState(false);

  async function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setSubiendo(true);
    const formData = new FormData();
    formData.append('file', file);
    const resultado = await subirDocumento(assetId, tipo, formData);
    setSubiendo(false);

    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    toast.success('Documento subido.');
    router.refresh();
  }

  async function eliminar(doc: DocumentoRow) {
    if (!window.confirm(`¿Eliminar "${doc.nombre}"?`)) return;
    const resultado = await eliminarDocumento(assetId, doc.id);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    toast.success('Documento eliminado.');
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {puedeGestionar ? (
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TIPO_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className={cn(buttonVariants({ variant: 'default', size: 'default' }), 'cursor-pointer', subiendo && 'pointer-events-none opacity-50')}>
            {subiendo ? <Loader2 className="animate-spin" aria-hidden /> : <Upload aria-hidden />}
            Subir documento
            <input type="file" className="hidden" onChange={onFileSelected} disabled={subiendo} />
          </label>
        </div>
      ) : null}

      {documentos.length === 0 ? (
        <EmptyState icon={FileText} titulo="Sin documentos" descripcion="Manuales, planos, certificados y garantías del activo aparecerán aquí." />
      ) : (
        <div className="divide-y rounded-[8px] border">
          {documentos.map((doc) => (
            <div key={doc.id} className="flex items-center gap-3 p-3">
              <FileText className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0 flex-1">
                <a href={doc.blobUrl} target="_blank" rel="noopener noreferrer" className="truncate text-sm font-medium hover:underline">
                  {doc.nombre}
                </a>
                <p className="text-2xs text-muted-foreground">
                  {TIPO_LABELS[doc.tipo] ?? doc.tipo} · {formatearTamano(doc.bytes)} · {fmtDate(doc.createdAt)}
                </p>
              </div>
              {puedeGestionar ? (
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => eliminar(doc)}>
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
