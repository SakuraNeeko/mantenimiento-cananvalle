import type { Metadata } from 'next';
import { requirePermission } from '@/lib/permissions';
import { PageHeader } from '@/components/layout/page-header';
import { obtenerDashboard } from './actions';
import { DashboardClient } from './dashboard-client';

export const metadata: Metadata = { title: 'Reportes' };

function inicioDeMes(): string {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString().slice(0, 10);
}
function hoy(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function ReportesPage() {
  await requirePermission('reportes.dashboard.ver');
  const rango = { desde: inicioDeMes(), hasta: hoy() };
  const inicial = await obtenerDashboard(rango.desde, rango.hasta);

  return (
    <div className="space-y-3">
      <PageHeader titulo="Reportes" descripcion="Indicadores calculados en vivo (§5 del prompt maestro): MTBF, MTTR, disponibilidad, cumplimiento, backlog, costos y Pareto." />
      <DashboardClient inicial={inicial} rangoInicial={rango} />
    </div>
  );
}
