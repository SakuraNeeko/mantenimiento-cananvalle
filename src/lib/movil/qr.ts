/** El QR de un activo (Fase 3, `qr-button.tsx`) enlaza a `/activos/<id>` — se extrae el id de ahí, sin protocolo propio. */
export function extraerIdActivoDeQr(texto: string): string | null {
  const m = texto.match(/\/activos\/([0-9a-f-]{36})/i);
  return m ? m[1]! : null;
}
