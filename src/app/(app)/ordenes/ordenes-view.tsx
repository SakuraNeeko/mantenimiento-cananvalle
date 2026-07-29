'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { LayoutGrid, Plus, Rows3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/data-table';
import type { ColumnFilter, SortRule, TableResult } from '@/components/data-table/types';
import { ordenColumns, type OrdenRow } from './columns';
import { KanbanBoard } from './kanban-board';

export function OrdenesView({
  vista,
  data,
  kanbanRows,
  sort,
  filters,
  search,
  puedeCrear,
}: {
  vista: 'lista' | 'kanban';
  data: TableResult<OrdenRow>;
  kanbanRows: OrdenRow[];
  sort: SortRule[];
  filters: ColumnFilter[];
  search: string;
  puedeCrear: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function cambiarVista(nueva: 'lista' | 'kanban') {
    const params = new URLSearchParams(searchParams.toString());
    params.set('vista', nueva);
    router.push(`${pathname}?${params.toString()}`);
  }

  const toggle = (
    <div className="flex items-center gap-0.5 rounded-[6px] border p-0.5">
      <Button variant={vista === 'lista' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => cambiarVista('lista')} title="Vista de lista">
        <Rows3 className="h-3.5 w-3.5" aria-hidden />
      </Button>
      <Button variant={vista === 'kanban' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => cambiarVista('kanban')} title="Vista kanban">
        <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
      </Button>
    </div>
  );

  const botonNueva = puedeCrear ? (
    <Button size="sm" onClick={() => router.push('/ordenes/nueva')}>
      <Plus aria-hidden />
      Nueva orden
    </Button>
  ) : null;

  if (vista === 'kanban') {
    return (
      <div className="flex h-full flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          {toggle}
          {botonNueva}
        </div>
        <div className="min-h-0 flex-1">
          <KanbanBoard rows={kanbanRows} />
        </div>
      </div>
    );
  }

  return (
    <DataTable
      modulo="ordenes"
      columns={ordenColumns}
      data={data}
      sort={sort}
      filters={filters}
      search={search}
      onRowClick={(row) => router.push(`/ordenes/${row.id}`)}
      acciones={
        <div className="flex items-center gap-2">
          {toggle}
          {botonNueva}
        </div>
      }
      vacio={{ titulo: 'Aún no hay órdenes de trabajo', descripcion: 'Cuando se planifique o convierta una solicitud, aparecerá aquí.' }}
    />
  );
}
