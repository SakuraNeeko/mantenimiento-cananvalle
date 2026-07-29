'use client';

import { useRouter } from 'next/navigation';
import { Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/data-table';
import type { ColumnFilter, SortRule, TableResult } from '@/components/data-table/types';
import { planColumns, type PlanRow } from './columns';

export function PlanesTable({
  data,
  sort,
  filters,
  search,
  puedeCrear,
  puedeGenerar,
}: {
  data: TableResult<PlanRow>;
  sort: SortRule[];
  filters: ColumnFilter[];
  search: string;
  puedeCrear: boolean;
  puedeGenerar: boolean;
}) {
  const router = useRouter();

  return (
    <DataTable
      modulo="planes"
      columns={planColumns}
      data={data}
      sort={sort}
      filters={filters}
      search={search}
      onRowClick={(row) => router.push(`/planes/${row.id}`)}
      acciones={
        <div className="flex items-center gap-2">
          {puedeGenerar ? (
            <Button variant="outline" size="sm" onClick={() => router.push('/planes/generar')}>
              <Sparkles aria-hidden />
              Analizar y generar OT
            </Button>
          ) : null}
          {puedeCrear ? (
            <Button size="sm" onClick={() => router.push('/planes/nuevo')}>
              <Plus aria-hidden />
              Nuevo plan
            </Button>
          ) : null}
        </div>
      }
      vacio={{ titulo: 'Aún no hay planes de mantenimiento', descripcion: 'Crea un plan para que el sistema genere sus órdenes de trabajo automáticamente.' }}
    />
  );
}
