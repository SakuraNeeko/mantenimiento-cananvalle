import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Estado vacío obligatorio (§6): explica qué es el módulo y ofrece la acción
 * primaria. Nunca una tabla vacía sin contexto.
 */
export function EmptyState({
  icon: Icon,
  titulo,
  descripcion,
  accion,
  className,
}: {
  icon?: LucideIcon;
  titulo: string;
  descripcion: string;
  accion?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 px-6 py-14 text-center', className)}>
      {Icon ? (
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted">
          <Icon className="h-5 w-5 text-muted-foreground" aria-hidden />
        </div>
      ) : null}
      <div className="space-y-1">
        <p className="text-sm font-semibold">{titulo}</p>
        <p className="mx-auto max-w-md text-xs text-muted-foreground">{descripcion}</p>
      </div>
      {accion}
    </div>
  );
}
