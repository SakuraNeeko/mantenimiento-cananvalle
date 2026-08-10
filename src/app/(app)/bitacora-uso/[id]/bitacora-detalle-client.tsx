'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Camera } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { fmtDateTime } from '@/lib/datetime';
import { ESTADO_LABELS, ESTADO_VARIANT } from '@/lib/validators/bitacora';
import { registrarRegreso } from '../actions';

type Bitacora = {
  id: string;
  assetId: string;
  assetCodigo: string | null;
  assetNombre: string | null;
  responsableNombre: string | null;
  proposito: string;
  estado: string;
  fechaSalida: Date;
  lecturaSalida: string | null;
  fotoSalidaUrl: string | null;
  fechaRegreso: Date | null;
  lecturaRegreso: string | null;
  fotoRegresoUrl: string | null;
  observaciones: string | null;
};

export function BitacoraDetalleClient({ bitacora, puedeRegistrar }: { bitacora: Bitacora; puedeRegistrar: boolean }) {
  const router = useRouter();
  const [dialogAbierto, setDialogAbierto] = React.useState(false);
  const [procesando, setProcesando] = React.useState(false);
  const [lecturaRegreso, setLecturaRegreso] = React.useState('');
  const [observaciones, setObservaciones] = React.useState('');
  const [foto, setFoto] = React.useState<File | null>(null);

  async function confirmarRegreso() {
    setProcesando(true);
    const formData = new FormData();
    if (foto) formData.append('foto', foto);
    const resultado = await registrarRegreso(bitacora.id, { lecturaRegreso: lecturaRegreso || undefined, observaciones: observaciones || undefined }, formData);
    setProcesando(false);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    toast.success('Regreso registrado.');
    setDialogAbierto(false);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>{bitacora.assetCodigo} — {bitacora.assetNombre}</CardTitle>
          <Badge variant={ESTADO_VARIANT[bitacora.estado] ?? 'neutral'}>{ESTADO_LABELS[bitacora.estado] ?? bitacora.estado}</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
            <div>
              <p className="text-2xs text-muted-foreground">Responsable</p>
              <p>{bitacora.responsableNombre}</p>
            </div>
            <div>
              <p className="text-2xs text-muted-foreground">Propósito</p>
              <p>{bitacora.proposito}</p>
            </div>
            <div>
              <p className="text-2xs text-muted-foreground">Salida</p>
              <p>{fmtDateTime(bitacora.fechaSalida)}</p>
            </div>
            {bitacora.lecturaSalida ? (
              <div>
                <p className="text-2xs text-muted-foreground">Lectura de salida</p>
                <p>{bitacora.lecturaSalida}</p>
              </div>
            ) : null}
            {bitacora.fechaRegreso ? (
              <div>
                <p className="text-2xs text-muted-foreground">Regreso</p>
                <p>{fmtDateTime(bitacora.fechaRegreso)}</p>
              </div>
            ) : null}
            {bitacora.lecturaRegreso ? (
              <div>
                <p className="text-2xs text-muted-foreground">Lectura de regreso</p>
                <p>{bitacora.lecturaRegreso}</p>
              </div>
            ) : null}
          </div>

          {bitacora.observaciones ? (
            <div className="rounded-[6px] border p-2 text-sm">
              <p className="text-2xs font-medium text-muted-foreground">Observaciones</p>
              <p>{bitacora.observaciones}</p>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            {bitacora.fotoSalidaUrl ? (
              <div className="space-y-1">
                <p className="text-2xs font-medium text-muted-foreground">Foto de salida</p>
                <a href={bitacora.fotoSalidaUrl} target="_blank" rel="noopener noreferrer">
                  <img src={bitacora.fotoSalidaUrl} alt="Foto de salida" className="max-h-48 rounded-[8px] border object-cover" />
                </a>
              </div>
            ) : null}
            {bitacora.fotoRegresoUrl ? (
              <div className="space-y-1">
                <p className="text-2xs font-medium text-muted-foreground">Foto de regreso</p>
                <a href={bitacora.fotoRegresoUrl} target="_blank" rel="noopener noreferrer">
                  <img src={bitacora.fotoRegresoUrl} alt="Foto de regreso" className="max-h-48 rounded-[8px] border object-cover" />
                </a>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {puedeRegistrar && bitacora.estado === 'ABIERTO' ? (
        <div className="flex justify-end">
          <Button onClick={() => setDialogAbierto(true)}>Registrar regreso</Button>
        </div>
      ) : null}

      <Dialog open={dialogAbierto} onOpenChange={setDialogAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar regreso</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Lectura de regreso</Label>
              <Input value={lecturaRegreso} onChange={(e) => setLecturaRegreso(e.target.value)} placeholder="Opcional" />
            </div>
            <div className="space-y-1">
              <Label>Foto de regreso</Label>
              <label className={cn(buttonVariants({ variant: 'outline', size: 'default' }), 'w-full cursor-pointer justify-start')}>
                <Camera aria-hidden />
                {foto ? foto.name : 'Tomar o subir foto'}
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => setFoto(e.target.files?.[0] ?? null)} />
              </label>
            </div>
            <div className="space-y-1">
              <Label>Observaciones</Label>
              <Textarea rows={2} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} placeholder="Estado del vehículo al regresar, novedades, etc." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAbierto(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmarRegreso} loading={procesando}>
              Registrar regreso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
