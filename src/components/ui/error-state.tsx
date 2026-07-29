'use client';

import { AlertTriangle, RotateCw } from 'lucide-react';
import { Button } from './button';

/**
 * Error humano en español, código de referencia y acción de reintento (§6).
 * Nunca un stack trace crudo.
 */
export function ErrorState({
  mensaje = 'No pudimos cargar la información.',
  codigo,
  onRetry,
}: {
  mensaje?: string;
  codigo?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold">{mensaje}</p>
        {codigo ? <p className="font-codigo text-2xs text-muted-foreground">Referencia: {codigo}</p> : null}
      </div>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCw aria-hidden />
          Reintentar
        </Button>
      ) : null}
    </div>
  );
}
