'use client';

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const TAMANOS = [25, 50, 100, 200];

export function DataTablePagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  const totalPaginas = Math.max(1, Math.ceil(total / pageSize));
  const desde = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const hasta = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-xs text-muted-foreground">
      <p className="tabular">
        {total === 0 ? 'Sin registros' : `Mostrando ${desde}–${hasta} de ${total.toLocaleString('es-EC')}`}
      </p>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span>Filas</span>
          <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
            <SelectTrigger className="h-7 w-[4.5rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TAMANOS.map((t) => (
                <SelectItem key={t} value={String(t)}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <span className="tabular">
          Página {page} de {totalPaginas}
        </span>

        <div className="flex items-center gap-0.5">
          <Button variant="outline" size="icon" className="h-7 w-7" disabled={page <= 1} onClick={() => onPageChange(1)} aria-label="Primera página">
            <ChevronsLeft />
          </Button>
          <Button variant="outline" size="icon" className="h-7 w-7" disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Página anterior">
            <ChevronLeft />
          </Button>
          <Button variant="outline" size="icon" className="h-7 w-7" disabled={page >= totalPaginas} onClick={() => onPageChange(page + 1)} aria-label="Página siguiente">
            <ChevronRight />
          </Button>
          <Button variant="outline" size="icon" className="h-7 w-7" disabled={page >= totalPaginas} onClick={() => onPageChange(totalPaginas)} aria-label="Última página">
            <ChevronsRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
