'use client';

import * as React from 'react';
import QRCode from 'qrcode';
import { QrCode, Download, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { baseUrl } from '@/lib/utils';

/** El QR enlaza a la ficha del activo — requiere sesión, no hay portal público en esta fase. */
export function QrButton({ id, codigo, nombre }: { id: string; codigo: string; nombre: string }) {
  const [abierto, setAbierto] = React.useState(false);
  const [dataUrl, setDataUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!abierto) return;
    const url = `${baseUrl(process.env.NEXT_PUBLIC_APP_URL) || window.location.origin}/activos/${id}`;
    QRCode.toDataURL(url, { width: 480, margin: 1 })
      .then(setDataUrl)
      .catch(() => setDataUrl(null));
  }, [abierto, id]);

  function imprimir() {
    if (!dataUrl) return;
    const ventana = window.open('', '_blank', 'width=420,height=520');
    if (!ventana) return;
    ventana.document.write(
      `<html><head><title>QR ${codigo}</title></head><body style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;">
        <img src="${dataUrl}" width="320" height="320" />
        <p style="font-weight:600;margin-top:8px;">${codigo}</p>
        <p style="font-size:12px;color:#666;">${nombre}</p>
        <script>window.onload = () => window.print();</script>
      </body></html>`,
    );
    ventana.document.close();
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setAbierto(true)}>
        <QrCode aria-hidden />
        Código QR
      </Button>

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Código QR — {codigo}</DialogTitle>
            <DialogDescription>Escanéalo para abrir la ficha de este activo directamente.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3 py-2">
            {dataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={dataUrl} alt={`QR de ${codigo}`} width={240} height={240} className="rounded-[8px] border" />
            ) : (
              <div className="flex h-60 w-60 items-center justify-center text-xs text-muted-foreground">Generando…</div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={!dataUrl} onClick={imprimir}>
                <Printer aria-hidden />
                Imprimir
              </Button>
              <Button variant="outline" size="sm" disabled={!dataUrl} asChild>
                <a href={dataUrl ?? undefined} download={`qr-${codigo}.png`}>
                  <Download aria-hidden />
                  Descargar
                </a>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
