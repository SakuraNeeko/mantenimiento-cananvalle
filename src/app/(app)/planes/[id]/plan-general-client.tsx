'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Pencil, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlanForm } from '../plan-form';
import { actualizarPlan, type OpcionesPlan } from '../actions';
import { ALCANCE_LABELS, CLASE_LABELS } from '@/lib/validators/plan';
import type { PlanFormValues } from '@/lib/validators/plan';

type Dato = { label: string; value: React.ReactNode };

function Ficha({ titulo, datos }: { titulo: string; datos: Dato[] }) {
  const visibles = datos.filter((d) => d.value !== null && d.value !== undefined && d.value !== '');
  if (visibles.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{titulo}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
        {visibles.map((d) => (
          <div key={d.label}>
            <p className="text-2xs text-muted-foreground">{d.label}</p>
            <p className="text-sm">{d.value}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function PlanGeneralClient({
  planId,
  valoresPrevios,
  opciones,
  detalle,
  puedeEditar,
}: {
  planId: string;
  valoresPrevios: PlanFormValues;
  opciones: OpcionesPlan;
  detalle: { assetNombre: string | null; assetCodigo: string | null; maintenanceTypeNombre: string | null; workTypeNombre: string | null; locationFiltroNombre: string | null; responsableNombre: string | null };
  puedeEditar: boolean;
}) {
  const router = useRouter();
  const [editando, setEditando] = React.useState(false);

  async function guardar(valores: PlanFormValues) {
    const resultado = await actualizarPlan(planId, valores);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    toast.success('Plan actualizado.');
    setEditando(false);
    router.refresh();
  }

  if (editando) {
    return (
      <div className="space-y-2">
        <Button variant="ghost" size="sm" onClick={() => setEditando(false)}>
          <X aria-hidden />
          Cancelar edición
        </Button>
        <PlanForm opciones={opciones} valoresPrevios={valoresPrevios} textoBoton="Guardar cambios" onGuardado={guardar} />
      </div>
    );
  }

  const v = valoresPrevios;

  return (
    <div className="space-y-3">
      {puedeEditar ? (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => setEditando(true)}>
            <Pencil aria-hidden />
            Editar
          </Button>
        </div>
      ) : null}

      <Ficha
        titulo="Alcance"
        datos={[
          { label: 'Tipo de alcance', value: ALCANCE_LABELS[v.alcance] },
          { label: 'Activo', value: v.alcance === 'ACTIVO_UNICO' ? (detalle.assetCodigo && detalle.assetNombre ? `${detalle.assetCodigo} — ${detalle.assetNombre}` : detalle.assetNombre) : null },
          { label: 'Clase', value: v.alcance === 'GRUPO' && v.claseFiltro ? CLASE_LABELS[v.claseFiltro as keyof typeof CLASE_LABELS] : null },
          { label: 'Criticidad', value: v.alcance === 'GRUPO' ? v.criticidadFiltro : null },
          { label: 'Ubicación', value: v.alcance === 'GRUPO' ? detalle.locationFiltroNombre : null },
        ]}
      />

      <Ficha
        titulo="Clasificación"
        datos={[
          { label: 'Tipo de mantenimiento', value: detalle.maintenanceTypeNombre },
          { label: 'Tipo de trabajo', value: detalle.workTypeNombre },
          { label: 'Responsable por defecto', value: detalle.responsableNombre },
          { label: 'Tiempo estimado', value: v.tiempoEstimadoHoras ? `${v.tiempoEstimadoHoras} h` : null },
        ]}
      />

      {v.instrucciones ? (
        <Card>
          <CardHeader>
            <CardTitle>Instrucciones generales</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{v.instrucciones}</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
