'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Camera, Loader2, ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/layout/page-header';
import { buscarActivoPorCodigo } from '../_lib/activos-actions';
import { extraerIdActivoDeQr } from '@/lib/movil/qr';

type ResultadoDeteccion = { rawValue: string };
type DetectorDeCodigos = { detect(fuente: CanvasImageSource): Promise<ResultadoDeteccion[]> };
type ConstructorDetector = new (opciones?: { formats: string[] }) => DetectorDeCodigos;

export function EscanearClient() {
  const router = useRouter();
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [soportado, setSoportado] = React.useState<boolean | null>(null);
  const [escaneando, setEscaneando] = React.useState(false);
  const [codigoManual, setCodigoManual] = React.useState('');
  const [buscando, setBuscando] = React.useState(false);

  React.useEffect(() => {
    // `window` no existe en SSR: la detección de la API solo puede hacerse tras montar.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSoportado('BarcodeDetector' in window);
  }, []);

  React.useEffect(() => {
    if (!escaneando) return;
    let activo = true;
    let stream: MediaStream | undefined;

    async function iniciar() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (!activo || !videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        const Detector = (window as unknown as { BarcodeDetector: ConstructorDetector }).BarcodeDetector;
        const detector = new Detector({ formats: ['qr_code'] });

        const paso = async () => {
          if (!activo || !videoRef.current) return;
          try {
            const codigos = await detector.detect(videoRef.current);
            const encontrado = codigos.map((c) => extraerIdActivoDeQr(c.rawValue)).find((id): id is string => Boolean(id));
            if (encontrado) {
              activo = false;
              setEscaneando(false);
              router.push(`/movil/activos/${encontrado}`);
              return;
            }
          } catch {
            // Un frame ilegible no es un error real — se reintenta en el próximo.
          }
          if (activo) requestAnimationFrame(paso);
        };
        requestAnimationFrame(paso);
      } catch {
        toast.error('No se pudo acceder a la cámara. Revisa los permisos del navegador.');
        setEscaneando(false);
      }
    }
    void iniciar();

    return () => {
      activo = false;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [escaneando, router]);

  async function buscarManual() {
    if (!codigoManual.trim()) return;
    setBuscando(true);
    const activo = await buscarActivoPorCodigo(codigoManual);
    setBuscando(false);
    if (!activo) {
      toast.error('No se encontró ningún activo con ese código.');
      return;
    }
    router.push(`/movil/activos/${activo.id}`);
  }

  return (
    <div className="space-y-3">
      <PageHeader titulo="Escanear" descripcion="Escanea el QR de un activo para abrir su ficha." />

      {soportado ? (
        <div className="space-y-2">
          {escaneando ? (
            <div className="overflow-hidden rounded-[8px] border">
              <video ref={videoRef} className="aspect-square w-full object-cover" muted playsInline />
            </div>
          ) : null}
          <Button className="min-h-11 w-full" variant={escaneando ? 'outline' : 'default'} onClick={() => setEscaneando((v) => !v)}>
            <ScanLine aria-hidden />
            {escaneando ? 'Cancelar' : 'Iniciar escaneo'}
          </Button>
        </div>
      ) : soportado === false ? (
        <p className="text-xs text-muted-foreground">
          Tu navegador no soporta escaneo de códigos QR (frecuente en iOS/Safari). Escribe el código del activo abajo.
        </p>
      ) : null}

      <div className="space-y-1.5 border-t pt-3">
        <Label htmlFor="codigo-manual">Buscar por código</Label>
        <div className="flex gap-2">
          <Input
            id="codigo-manual"
            className="min-h-11"
            placeholder="ACT-0001"
            value={codigoManual}
            onChange={(e) => setCodigoManual(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && buscarManual()}
          />
          <Button className="min-h-11" onClick={buscarManual} disabled={buscando}>
            {buscando ? <Loader2 className="animate-spin" aria-hidden /> : <Camera aria-hidden />}
            Buscar
          </Button>
        </div>
      </div>
    </div>
  );
}
