import type { Metadata } from 'next';
import { requirePermission } from '@/lib/permissions';
import { EscanearClient } from './escanear-client';

export const metadata: Metadata = { title: 'Escanear' };

export default async function EscanearPage() {
  await requirePermission('activos.ver');
  return <EscanearClient />;
}
