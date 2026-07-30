import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

export const DEFAULT_TZ = process.env.DEFAULT_TIMEZONE ?? 'America/Guayaquil';

/** Todas las fechas se guardan en UTC (timestamptz) y se presentan en la zona del tenant. */
export function fmtDate(value: Date | string | null | undefined, tz = DEFAULT_TZ): string {
  if (!value) return '—';
  return formatInTimeZone(new Date(value), tz, 'dd/MM/yyyy', { locale: es });
}

export function fmtDateTime(value: Date | string | null | undefined, tz = DEFAULT_TZ): string {
  if (!value) return '—';
  return formatInTimeZone(new Date(value), tz, "dd/MM/yyyy HH:mm", { locale: es });
}

export function fmtRelative(value: Date | string | null | undefined, tz = DEFAULT_TZ): string {
  if (!value) return '—';
  return formatDistanceToNow(toZonedTime(new Date(value), tz), { addSuffix: true, locale: es });
}

/** Ventana [hoy - N días, hoy]. Usa la hora real de ejecución: no es apta para un render de cliente, solo para código server-only (Server Components, Server Actions). */
export function hace(dias: number): Date {
  return new Date(Date.now() - dias * 24 * 3600 * 1000);
}

/** Primer día del mes en curso (UTC). Mismo caso de uso que [[hace]]. */
export function inicioDeMesActual(): Date {
  const ahora = new Date();
  return new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), 1));
}

export { format };
