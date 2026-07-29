'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { guardarCaracteristicas } from './actions';

export type CaracteristicaConValor = {
  id: string;
  nombre: string;
  tipoDato: 'TEXTO' | 'NUMERO' | 'BOOLEANO' | 'FECHA' | 'OPCION';
  opciones: string[] | null;
  ayuda: string | null;
  valor: string | null;
};

const SIN_VALOR = '__vacio__';

export function CaracteristicasForm({ assetId, items }: { assetId: string; items: CaracteristicaConValor[] }) {
  const router = useRouter();
  const [valores, setValores] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(items.map((c) => [c.id, c.valor ?? ''])),
  );
  const [guardando, setGuardando] = React.useState(false);

  async function guardar() {
    setGuardando(true);
    const resultado = await guardarCaracteristicas(assetId, valores);
    setGuardando(false);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    toast.success('Características guardadas.');
    router.refresh();
  }

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No hay características definidas para esta clase de activo. Créalas en Infraestructura → Características.</p>;
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="grid grid-cols-2 gap-3">
          {items.map((c) => (
            <div key={c.id} className={c.tipoDato === 'BOOLEANO' ? 'flex items-center gap-2 pt-5' : 'space-y-1'}>
              {c.tipoDato === 'BOOLEANO' ? (
                <>
                  <Checkbox
                    id={c.id}
                    checked={valores[c.id] === 'true'}
                    onCheckedChange={(v) => setValores((prev) => ({ ...prev, [c.id]: v ? 'true' : '' }))}
                  />
                  <Label htmlFor={c.id} className="font-normal">
                    {c.nombre}
                  </Label>
                </>
              ) : (
                <>
                  <Label htmlFor={c.id}>{c.nombre}</Label>
                  {c.tipoDato === 'OPCION' ? (
                    <Select
                      value={valores[c.id] || SIN_VALOR}
                      onValueChange={(v) => setValores((prev) => ({ ...prev, [c.id]: v === SIN_VALOR ? '' : v }))}
                    >
                      <SelectTrigger id={c.id}>
                        <SelectValue placeholder="Selecciona…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={SIN_VALOR}>Sin selección</SelectItem>
                        {(c.opciones ?? []).map((o) => (
                          <SelectItem key={o} value={o}>
                            {o}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id={c.id}
                      type={c.tipoDato === 'NUMERO' ? 'number' : c.tipoDato === 'FECHA' ? 'date' : 'text'}
                      value={valores[c.id] ?? ''}
                      onChange={(e) => setValores((prev) => ({ ...prev, [c.id]: e.target.value }))}
                    />
                  )}
                  {c.ayuda ? <p className="text-2xs text-muted-foreground">{c.ayuda}</p> : null}
                </>
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <Button size="sm" onClick={guardar} loading={guardando}>
            Guardar características
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
