'use client';

import * as React from 'react';

type SidebarMobileState = { abierto: boolean; alternar: () => void; cerrar: () => void };

const SidebarMobileContext = React.createContext<SidebarMobileState | null>(null);

/**
 * Estado del cajón de navegación en pantallas angostas (< md). En escritorio
 * el sidebar es fijo y siempre visible; en celular se oculta fuera de
 * pantalla y este contexto es lo que conecta el botón de hamburguesa del
 * topbar con el propio `<Sidebar>`, que viven en componentes separados.
 */
export function SidebarMobileProvider({ children }: { children: React.ReactNode }) {
  const [abierto, setAbierto] = React.useState(false);
  const value = React.useMemo(() => ({ abierto, alternar: () => setAbierto((v) => !v), cerrar: () => setAbierto(false) }), [abierto]);
  return <SidebarMobileContext.Provider value={value}>{children}</SidebarMobileContext.Provider>;
}

export function useSidebarMobile(): SidebarMobileState {
  const ctx = React.useContext(SidebarMobileContext);
  if (!ctx) throw new Error('useSidebarMobile debe usarse dentro de <SidebarMobileProvider>.');
  return ctx;
}
