'use client';

import { useEffect } from 'react';
import { ErrorState } from '@/components/ui/error-state';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[app]', error);
  }, [error]);

  return (
    <div className="grid min-h-dvh place-items-center p-6">
      <ErrorState
        mensaje="Ocurrió un error inesperado al procesar tu solicitud."
        codigo={error.digest}
        onRetry={reset}
      />
    </div>
  );
}
