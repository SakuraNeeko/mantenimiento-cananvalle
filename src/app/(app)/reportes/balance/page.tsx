import type { Metadata } from 'next';
import { requirePermission } from '@/lib/permissions';
import { PageHeader } from '@/components/layout/page-header';
import { obtenerBalances } from '../actions';
import { BalanceClient } from './balance-client';

export const metadata: Metadata = { title: 'Balance periódico' };

export default async function BalancePage() {
  await requirePermission('historia.ver');
  const balances = await obtenerBalances();

  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <PageHeader titulo="Balance periódico de gestión" descripcion="Un cierre inmutable de costos, cumplimiento y disponibilidad por mes, trimestre o año." />
      <BalanceClient balances={balances} />
    </div>
  );
}
