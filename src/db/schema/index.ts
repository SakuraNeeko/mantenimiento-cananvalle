/**
 * Punto único de exportación del esquema.
 * Un archivo por dominio; las fases posteriores añaden aquí sus módulos:
 *   Fase 2 → infra.ts   Fase 3 → assets.ts   Fase 4 → inventory.ts
 *   Fase 5 → requests.ts Fase 6 → work-orders.ts Fase 7 → plans.ts …
 */
export * from './enums';
export * from './_shared';
export * from './core';
export * from './infra';
export * from './inventory';
export * from './assets';
export * from './service-requests';
export * from './work-orders';
export * from './plans';
export * from './downtimes';
export * from './historia';
export * from './combustibles';
export * from './tecnovigilancia';
export * from './sync';
