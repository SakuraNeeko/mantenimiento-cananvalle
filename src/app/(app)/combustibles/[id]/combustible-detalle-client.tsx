'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Gauge, Pencil, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatMoney } from '@/lib/utils';
import { fmtDateTime } from '@/lib/datetime';
import { CombustibleForm } from '../combustible-form';
import { editarCombustible, eliminarCombustible, type OpcionesCombustible, type RegistroCombustibleValues } from '../actions';

type Registro = {
  id: string;
  assetId: string;
  assetCodigo: string | null;
  assetNombre: string | null;
  fuelId: string;
  fuelNombre: string | null;
  fecha: Date;
  cantidad: string;
  costoUnitario: string;
  costoTotal: string;
  lectura: string | null;
  partyNombre: string | null;
  conductorNombre: string | null;
  numeroFactura: string | null;
  observaciones: string | null;
};

export function CombustibleDetalleClient({ registro, opciones, permisos }: { registro: Registro; opciones: OpcionesCombustible; permisos: { editar: boolean } }) {
  const router = useRouter();
  const [editando, setEditando] = React.useState(false);
  const [eliminando, setEliminando] = React.useState(false);

  async function guardar(valores: RegistroCombustibleValues) {
    const resultado = await editarCombustible(registro.id, valores);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    toast.success('Registro actualizado.');
    setEditando(false);
    router.refresh();
  }

  async function eliminar() {
    if (!window.confirm('¿Eliminar este registro de combustible? No se puede deshacer.')) return;
    setEliminando(true);
    const resultado = await eliminarCombustible(registro.id);
    setEliminando(false);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    toast.success('Registro eliminado.');
    router.push('/combustibles');
  }

  if (editando) {
    return (
      <div className="space-y-2">
        <Button variant="ghost" size="sm" onClick={() => setEditando(false)}>
          <X aria-hidden />
          Cancelar edición
        </Button>
        <CombustibleForm
          opciones={opciones}
          valoresPrevios={{
            assetId: registro.assetId,
            fuelId: registro.fuelId,
            fecha: registro.fecha.toISOString().slice(0, 16),
            cantidad: registro.cantidad,
            costoUnitario: registro.costoUnitario,
            lectura: registro.lectura ?? undefined,
            numeroFactura: registro.numeroFactura ?? undefined,
            observaciones: registro.observaciones ?? undefined,
          }}
          textoBoton="Guardar cambios"
          onGuardado={guardar}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>
            {registro.assetCodigo} — {registro.assetNombre}
          </CardTitle>
          <div className="flex gap-1.5">
            {permisos.editar ? (
              <>
                <Button variant="outline" size="sm" onClick={() => setEditando(true)}>
                  <Pencil aria-hidden />
                  Editar
                </Button>
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={eliminar} disabled={eliminando}>
                  <Trash2 aria-hidden />
                  Eliminar
                </Button>
              </>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
          <div>
            <p className="text-2xs text-muted-foreground">Fecha</p>
            <p>{fmtDateTime(registro.fecha)}</p>
          </div>
          <div>
            <p className="text-2xs text-muted-foreground">Combustible</p>
            <p>{registro.fuelNombre}</p>
          </div>
          <div>
            <p className="text-2xs text-muted-foreground">Cantidad</p>
            <p>{registro.cantidad}</p>
          </div>
          <div>
            <p className="text-2xs text-muted-foreground">Costo unitario</p>
            <p>{formatMoney(registro.costoUnitario)}</p>
          </div>
          <div>
            <p className="text-2xs text-muted-foreground">Costo total</p>
            <p className="font-medium">{formatMoney(registro.costoTotal)}</p>
          </div>
          {registro.lectura ? (
            <div>
              <p className="text-2xs text-muted-foreground">Lectura</p>
              <p>{registro.lectura}</p>
            </div>
          ) : null}
          {registro.partyNombre ? (
            <div>
              <p className="text-2xs text-muted-foreground">Estación / proveedor</p>
              <p>{registro.partyNombre}</p>
            </div>
          ) : null}
          {registro.conductorNombre ? (
            <div>
              <p className="text-2xs text-muted-foreground">Conductor</p>
              <p>{registro.conductorNombre}</p>
            </div>
          ) : null}
          {registro.numeroFactura ? (
            <div>
              <p className="text-2xs text-muted-foreground">N.º de factura</p>
              <p>{registro.numeroFactura}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {registro.observaciones ? (
        <Card>
          <CardContent className="pt-4 text-sm">{registro.observaciones}</CardContent>
        </Card>
      ) : null}

      <Button variant="outline" asChild>
        <Link href={`/combustibles/rendimiento?assetId=${registro.assetId}`}>
          <Gauge aria-hidden />
          Ver rendimiento de este activo
        </Link>
      </Button>
    </div>
  );
}
