import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MessageSquareWarning } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { obtenerActivoMovil } from '../../_lib/activos-actions';

export const metadata: Metadata = { title: 'Activo' };

export default async function ActivoMovilPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const activo = await obtenerActivoMovil(id);
  if (!activo) notFound();

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="space-y-2 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="font-codigo text-2xs text-muted-foreground">{activo.codigo}</span>
            <Badge variant="neutral">{activo.criticidad}</Badge>
          </div>
          <p className="text-base font-semibold">{activo.nombre}</p>
          <p className="text-2xs text-muted-foreground">
            {activo.clase} · {activo.ubicacion ?? 'Sin ubicación'} {activo.estado ? `· ${activo.estado}` : ''}
          </p>
        </CardContent>
      </Card>

      <Button className="min-h-11 w-full" asChild>
        <Link href={`/movil/solicitudes/nueva?assetId=${activo.id}`}>
          <MessageSquareWarning aria-hidden />
          Reportar novedad de este activo
        </Link>
      </Button>
    </div>
  );
}
