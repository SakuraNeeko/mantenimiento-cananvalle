'use client';

import * as React from 'react';
import { iniciarAutoSync, sincronizarCola } from '@/lib/movil/sync-manager';

/** Registra el service worker (app shell offline) y arranca la sincronización automática. Sin marcado — solo efectos. */
export function SwRegister() {
  React.useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
    void sincronizarCola();
    return iniciarAutoSync();
  }, []);

  return null;
}
