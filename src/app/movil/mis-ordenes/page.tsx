import type { Metadata } from 'next';
import { requirePermission } from '@/lib/permissions';
import { obtenerMisOrdenesParaCache } from '../_lib/sync-actions';
import { MisOrdenesClient } from './mis-ordenes-client';

export const metadata: Metadata = { title: 'Mis OT' };

export default async function MisOrdenesPage() {
  await requirePermission('ordenes.ver');
  const ordenesIniciales = await obtenerMisOrdenesParaCache();

  return <MisOrdenesClient ordenesIniciales={ordenesIniciales} />;
}
