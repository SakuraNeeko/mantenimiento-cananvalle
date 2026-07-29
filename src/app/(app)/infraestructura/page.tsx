import type { Metadata } from 'next';
import Link from 'next/link';
import { Network } from 'lucide-react';
import { requirePermission } from '@/lib/permissions';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CATALOGOS } from '@/lib/catalogs/registry';

export const metadata: Metadata = { title: 'Infraestructura' };

export default async function InfraestructuraPage() {
  await requirePermission('infra.catalogos.ver');

  return (
    <div className="space-y-3">
      <PageHeader
        titulo="Infraestructura"
        descripcion="Catálogos parametrizables que alimentan Activos, Almacén, Solicitudes, Órdenes y Planes."
      />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {CATALOGOS.map((c) => (
          <Link key={c.slug} href={`/infraestructura/${c.slug}`}>
            <Card className="h-full transition-colors hover:bg-accent/50">
              <CardContent className="space-y-1.5 p-4">
                <div className="flex items-center gap-2">
                  <CardTitle>{c.titulo}</CardTitle>
                  {c.jerarquico ? (
                    <Badge variant="info" className="gap-1">
                      <Network className="h-3 w-3" aria-hidden />
                      Árbol
                    </Badge>
                  ) : null}
                </div>
                <CardDescription>{c.descripcion}</CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
