import Link from 'next/link';
import { FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center p-6">
      <EmptyState
        icon={FileQuestion}
        titulo="No encontramos esta página"
        descripcion="La dirección no existe o el registro fue eliminado."
        accion={
          <Button asChild size="sm">
            <Link href="/dashboard">Ir al dashboard</Link>
          </Button>
        }
      />
    </div>
  );
}
