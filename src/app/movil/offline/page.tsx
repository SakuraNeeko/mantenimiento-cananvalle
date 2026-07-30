import { WifiOff } from 'lucide-react';

export const metadata = { title: 'Sin conexión' };

/**
 * Página de respaldo que el service worker sirve cuando no hay red ni caché
 * para la ruta pedida. El trabajo real sin conexión (checklist, fotos,
 * firma) sigue funcionando dentro de "Mis OT" gracias a IndexedDB — esta
 * pantalla solo aparece si se intenta abrir algo que nunca se cacheó.
 */
export default function OfflinePage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 py-16 text-center">
      <WifiOff className="h-10 w-10 text-muted-foreground" aria-hidden />
      <p className="text-sm font-semibold">Sin conexión</p>
      <p className="max-w-xs text-xs text-muted-foreground">
        Esta pantalla todavía no se había abierto con conexión, así que no está disponible sin señal. Tus órdenes ya
        cacheadas siguen funcionando en &quot;Mis OT&quot;.
      </p>
    </div>
  );
}
