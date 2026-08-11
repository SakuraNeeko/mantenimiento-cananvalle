'use client';

import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { fmtDateTime } from '@/lib/datetime';
import type { BitacoraAbierta } from './actions';

export function BitacoraChoferView({ abiertos }: { abiertos: BitacoraAbierta[] }) {
  const router = useRouter();

  return (
    <div className="space-y-3">
      <Button className="w-full" size="lg" onClick={() => router.push('/bitacora-uso/nueva')}>
        <Plus aria-hidden />
        Registrar salida
      </Button>

      {abiertos.length > 0 ? (
        <div className="space-y-2">
          <p className="text-2xs font-medium text-muted-foreground">Viajes en curso</p>
          {abiertos.map((v) => (
            <Card key={v.id} className="cursor-pointer transition-colors hover:bg-accent" onClick={() => router.push(`/bitacora-uso/${v.id}`)}>
              <CardContent className="flex items-center justify-between gap-3 p-3">
                <div>
                  <p className="text-sm font-medium">{v.assetCodigo ? `${v.assetCodigo} — ${v.assetNombre}` : v.assetNombre}</p>
                  <p className="text-2xs text-muted-foreground">
                    Destino: {v.destinoNombre ?? v.destinoOtro ?? '—'} · Salió {fmtDateTime(v.fechaSalida)}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); router.push(`/bitacora-uso/${v.id}`); }}>
                  Registrar regreso
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}
