'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { fmtDateTime } from '@/lib/datetime';
import { usePendientesSync, sincronizarCola } from '@/lib/movil/sync-manager';
import type { ConflictoSync } from '../_lib/sync-actions';

export function SyncPanel({ conflictos }: { conflictos: ConflictoSync[] }) {
  const pendientes = usePendientesSync();
  const [sincronizando, setSincronizando] = React.useState(false);

  async function sincronizarAhora() {
    setSincronizando(true);
    const resumen = await sincronizarCola();
    setSincronizando(false);
    if (resumen.ok === 0 && resumen.error === 0) {
      toast.info('No había nada pendiente por sincronizar.');
      return;
    }
    toast[resumen.error > 0 ? 'warning' : 'success'](
      `Sincronizado: ${resumen.ok} ok${resumen.conflictos > 0 ? `, ${resumen.conflictos} con conflicto resuelto` : ''}${resumen.error > 0 ? `, ${resumen.error} con error` : ''}.`,
    );
  }

  return (
    <Card>
      <CardContent className="space-y-2 p-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold">Sincronización</p>
          {pendientes > 0 ? <Badge variant="warning">{pendientes} pendientes</Badge> : <Badge variant="success">Al día</Badge>}
        </div>
        <Button size="sm" variant="outline" className="min-h-11 w-full" onClick={sincronizarAhora} disabled={sincronizando}>
          {sincronizando ? <Loader2 className="animate-spin" aria-hidden /> : <RefreshCw aria-hidden />}
          Sincronizar ahora
        </Button>

        {conflictos.length > 0 ? (
          <div className="space-y-1.5 border-t pt-2">
            <p className="flex items-center gap-1 text-2xs font-medium text-warning-foreground">
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
              Conflictos resueltos (última escritura gana)
            </p>
            {conflictos.map((c) => (
              <p key={c.id} className="text-2xs text-muted-foreground">
                {c.entidad}.{c.campo}: &quot;{c.valorServidor ?? '—'}&quot; → &quot;{c.valorCliente ?? '—'}&quot; · {fmtDateTime(c.fecha)}
              </p>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
