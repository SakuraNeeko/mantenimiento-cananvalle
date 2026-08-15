'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { fmtDate } from '@/lib/datetime';
import { formatMoney } from '@/lib/utils';
import { ActivoForm } from '../activo-form';
import { eliminarActivo, type OpcionesActivo } from '../actions';
import type { ActivoFormValues } from '@/lib/validators/activo';

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

export function GeneralTabClient({
  activoId,
  valoresPrevios,
  opciones,
  detalle,
  componentes,
  puedeEditar,
  puedeCrear,
  puedeEliminar,
}: {
  activoId: string;
  valoresPrevios: ActivoFormValues;
  opciones: OpcionesActivo;
  detalle: { ubicacion: string | null; centroCosto: string | null; centroResponsable: string | null; proveedor: string | null; contrato: string | null };
  componentes: { id: string; codigo: string; nombre: string; estado: string }[];
  puedeEditar: boolean;
  puedeCrear: boolean;
  puedeEliminar: boolean;
}) {
  const router = useRouter();
  const [editando, setEditando] = React.useState(false);
  const [eliminando, setEliminando] = React.useState(false);

  async function eliminar() {
    if (!window.confirm(`¿Eliminar "${valoresPrevios.nombre}"? Esta acción no se puede deshacer desde la interfaz.`)) return;
    setEliminando(true);
    const resultado = await eliminarActivo(activoId);
    setEliminando(false);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    toast.success('Activo eliminado.');
    router.push('/activos');
  }

  if (editando) {
    return (
      <div className="space-y-2">
        <Button variant="ghost" size="sm" onClick={() => setEditando(false)}>
          <X aria-hidden />
          Cancelar edición
        </Button>
        <ActivoForm
          modo="editar"
          activoId={activoId}
          opciones={opciones}
          valoresPrevios={valoresPrevios}
          onGuardado={() => {
            setEditando(false);
            router.refresh();
          }}
        />
      </div>
    );
  }

  const v = valoresPrevios;

  return (
    <div className="space-y-3">
      {puedeEditar || puedeEliminar ? (
        <div className="flex justify-end gap-2">
          {puedeEliminar ? (
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={eliminar} disabled={eliminando}>
              <Trash2 aria-hidden />
              Eliminar
            </Button>
          ) : null}
          {puedeEditar ? (
            <Button variant="outline" size="sm" onClick={() => setEditando(true)}>
              <Pencil aria-hidden />
              Editar
            </Button>
          ) : null}
        </div>
      ) : null}

      <Ficha
        titulo="Identificación"
        datos={[
          { label: 'Descripción', value: v.descripcion },
          { label: 'Ubicación', value: detalle.ubicacion },
          { label: 'Centro de costo', value: detalle.centroCosto },
          { label: 'Centro responsable', value: detalle.centroResponsable },
        ]}
      />

      <Ficha
        titulo="Datos técnicos"
        datos={[
          { label: 'Fabricante', value: v.fabricante },
          { label: 'Modelo', value: v.modelo },
          { label: 'Serie', value: v.serie },
          { label: 'Placa', value: v.placa },
          { label: 'Año', value: v.anio },
        ]}
      />

      <Ficha
        titulo="Valores y garantía"
        datos={[
          { label: 'Fecha de compra', value: v.fechaCompra ? fmtDate(v.fechaCompra) : null },
          { label: 'Valor de compra', value: v.valorCompra ? formatMoney(v.valorCompra) : null },
          { label: 'Valor actual', value: v.valorActual ? formatMoney(v.valorActual) : null },
          { label: 'Vida útil', value: v.vidaUtilMeses ? `${v.vidaUtilMeses} meses` : null },
          { label: 'Garantía hasta', value: v.garantiaFin ? fmtDate(v.garantiaFin) : null },
        ]}
      />

      <Ficha titulo="Proveedor y contrato" datos={[{ label: 'Proveedor', value: detalle.proveedor }, { label: 'Contrato', value: detalle.contrato }]} />

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Componentes (despiece)</CardTitle>
          {puedeCrear ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/activos/nuevo?parentId=${activoId}`}>
                <Plus aria-hidden />
                Agregar componente
              </Link>
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          {componentes.length === 0 ? (
            <p className="text-xs text-muted-foreground">Este activo no tiene componentes registrados.</p>
          ) : (
            <ul className="space-y-1">
              {componentes.map((c) => (
                <li key={c.id}>
                  <Link href={`/activos/${c.id}`} className="flex items-center gap-2 rounded-[6px] px-2 py-1 text-sm hover:bg-accent/50">
                    <span className="font-codigo text-2xs text-muted-foreground">{c.codigo}</span>
                    {c.nombre}
                    <Badge variant="neutral" className="ml-auto">
                      {c.estado}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
