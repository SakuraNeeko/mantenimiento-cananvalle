'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { activarPlan, desactivarPlan, eliminarPlan, type AccionResultado } from '../actions';

export function PlanAcciones({
  planId,
  activo,
  permisos,
}: {
  planId: string;
  activo: boolean;
  permisos: { activar: boolean; eliminar: boolean };
}) {
  const router = useRouter();
  const [procesando, setProcesando] = React.useState(false);

  async function ejecutar(accion: () => Promise<AccionResultado>, mensajeExito: string) {
    setProcesando(true);
    const resultado = await accion();
    setProcesando(false);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    toast.success(mensajeExito);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1.5">
      {permisos.activar ? (
        activo ? (
          <Button variant="outline" onClick={() => ejecutar(() => desactivarPlan(planId), 'Plan desactivado.')} loading={procesando}>
            Desactivar
          </Button>
        ) : (
          <Button onClick={() => ejecutar(() => activarPlan(planId), 'Plan activado.')} loading={procesando}>
            Activar
          </Button>
        )
      ) : null}
      {permisos.eliminar ? (
        <Button
          variant="outline"
          className="text-destructive hover:text-destructive"
          onClick={async () => {
            const resultado = await eliminarPlan(planId);
            if (!resultado.ok) {
              toast.error(resultado.error);
              return;
            }
            toast.success('Plan eliminado.');
            router.push('/planes');
          }}
          disabled={procesando}
        >
          Eliminar
        </Button>
      ) : null}
    </div>
  );
}
