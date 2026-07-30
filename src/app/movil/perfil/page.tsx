import type { Metadata } from 'next';
import { auth, signOut } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/layout/page-header';
import { LogOut } from 'lucide-react';
import { obtenerMisConflictosSync } from '../_lib/sync-actions';
import { SyncPanel } from './sync-panel';

export const metadata: Metadata = { title: 'Perfil' };

export default async function PerfilMovilPage() {
  const session = await auth();
  const conflictos = await obtenerMisConflictosSync();

  return (
    <div className="space-y-3">
      <PageHeader titulo="Perfil" />

      <Card>
        <CardContent className="space-y-1 p-3">
          <p className="text-sm font-medium">{session?.user.nombre}</p>
          <p className="text-2xs text-muted-foreground">{session?.user.email}</p>
        </CardContent>
      </Card>

      <SyncPanel conflictos={conflictos} />

      <form
        action={async () => {
          'use server';
          await signOut({ redirectTo: '/login' });
        }}
      >
        <Button variant="outline" className="min-h-11 w-full" type="submit">
          <LogOut aria-hidden />
          Cerrar sesión
        </Button>
      </form>
    </div>
  );
}
