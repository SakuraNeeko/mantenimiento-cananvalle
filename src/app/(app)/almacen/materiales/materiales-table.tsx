'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/data-table';
import type { ColumnFilter, SortRule, TableResult } from '@/components/data-table/types';
import { materialColumns, type MaterialRow } from './columns';
import { MaterialForm } from './material-form';
import { MaterialesImportExport } from './import-export';

export function MaterialesTable({
  data,
  sort,
  filters,
  search,
  puedeGestionar,
  puedeExportar,
  puedeImportar,
}: {
  data: TableResult<MaterialRow>;
  sort: SortRule[];
  filters: ColumnFilter[];
  search: string;
  puedeGestionar: boolean;
  puedeExportar: boolean;
  puedeImportar: boolean;
}) {
  const router = useRouter();
  const [dialogAbierto, setDialogAbierto] = React.useState(false);

  return (
    <>
      <DataTable
        modulo="materiales"
        columns={materialColumns}
        data={data}
        sort={sort}
        filters={filters}
        search={search}
        onRowClick={(row) => router.push(`/almacen/materiales/${row.id}`)}
        acciones={
          <>
            <MaterialesImportExport filtros={filters} search={search} puedeExportar={puedeExportar} puedeImportar={puedeImportar} />
            {puedeGestionar ? (
              <Button size="sm" onClick={() => setDialogAbierto(true)}>
                <Plus aria-hidden />
                Nuevo material
              </Button>
            ) : null}
          </>
        }
        vacio={{
          titulo: 'Aún no hay materiales',
          descripcion: 'Repuestos, insumos, herramientas y EPP que se controlan por kárdex y existencias.',
        }}
      />

      {puedeGestionar ? (
        <MaterialForm
          open={dialogAbierto}
          onOpenChange={setDialogAbierto}
          onGuardado={(id) => {
            router.push(`/almacen/materiales/${id}`);
          }}
        />
      ) : null}
    </>
  );
}
