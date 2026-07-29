import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formatea un importe en la moneda del tenant. Los importes llegan como string desde numeric(18,4). */
export function formatMoney(value: string | number | null | undefined, currency = 'USD', locale = 'es-EC'): string {
  if (value === null || value === undefined || value === '') return '—';
  const n = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(n)) return '—';
  return new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: 2 }).format(n);
}

export function formatNumber(value: string | number | null | undefined, decimals = 2, locale = 'es-EC'): string {
  if (value === null || value === undefined || value === '') return '—';
  const n = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(n)) return '—';
  return new Intl.NumberFormat(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n);
}

/**
 * Quita la barra final de una URL base.
 * Regla técnica §2: una barra extra provoca 308 y rompe los POST en Vercel.
 */
export function baseUrl(raw: string | undefined): string {
  return (raw ?? '').replace(/\/+$/, '');
}
