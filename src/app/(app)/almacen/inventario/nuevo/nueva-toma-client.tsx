'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { crearInventarioFisico, obtenerAlmacenesParaInventario } from '../actions';

export function NuevaTomaClient() {
  const router = useRouter();
  const [almacenes, setAlmacenes] = React.useState<{ value: string; label: string }[]>([]);
  const [warehouseId, setWarehouseId] = React.useState('');
  const [creando, setCreando] = React.useState(false);

  React.useEffect(() => {
    obtenerAlmacenesParaInventario().then(setAlmacenes);
  }, []);

  async function crear() {
    if (!warehouseId) {
      toast.error('Selecciona un almacén.');
      return;
    }
    setCreando(true);
    const resultado = await crearInventarioFisico(warehouseId);
    setCreando(false);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    toast.success('Toma física abierta.');
    router.push(`/almacen/inventario/${resultado.id}`);
  }

  return (
    <div className="max-w-sm space-y-3">
      <div className="space-y-1">
        <Label>Almacén</Label>
        <Select value={warehouseId} onValueChange={setWarehouseId}>
          <SelectTrigger>
            <SelectValue placeholder="Selecciona…" />
          </SelectTrigger>
          <SelectContent>
            {almacenes.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button onClick={crear} loading={creando}>
        Abrir toma
      </Button>
    </div>
  );
}
