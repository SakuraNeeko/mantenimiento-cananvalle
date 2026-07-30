'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check, Copy, KeyRound, Plus, ShieldOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { fmtDateTime } from '@/lib/datetime';
import { ALCANCES_API, type AlcanceApi } from '@/lib/api-publica/auth';
import { crearApiKey, revocarApiKey } from './actions';

type ApiKeyRow = { id: string; nombre: string; prefijo: string; permisos: unknown; expiraAt: Date | null; revocadaAt: Date | null; createdAt: Date };
type WebhookRow = { id: string; url: string; ok: boolean; statusCode: number | null; error: string | null; createdAt: Date };

export function IntegracionesClient({ apiKeysIniciales, webhooks }: { apiKeysIniciales: ApiKeyRow[]; webhooks: WebhookRow[] }) {
  const router = useRouter();
  const [dialogAbierto, setDialogAbierto] = React.useState(false);
  const [nombre, setNombre] = React.useState('');
  const [alcance, setAlcance] = React.useState<AlcanceApi[]>([]);
  const [creando, setCreando] = React.useState(false);
  const [keyRecienCreada, setKeyRecienCreada] = React.useState<string | null>(null);
  const [copiado, setCopiado] = React.useState(false);

  function alternarAlcance(a: AlcanceApi) {
    setAlcance((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));
  }

  async function crear() {
    setCreando(true);
    const resultado = await crearApiKey(nombre, alcance);
    setCreando(false);
    if (!resultado.ok) return toast.error(resultado.error);
    setKeyRecienCreada(resultado.keyEnClaro);
    setNombre('');
    setAlcance([]);
    router.refresh();
  }

  async function copiarKey() {
    if (!keyRecienCreada) return;
    await navigator.clipboard.writeText(keyRecienCreada);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  async function revocar(id: string) {
    if (!window.confirm('¿Revocar esta API key? Dejará de funcionar de inmediato.')) return;
    const resultado = await revocarApiKey(id);
    if (!resultado.ok) return toast.error(resultado.error);
    toast.success('API key revocada.');
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">API keys</h2>
          <Button size="sm" onClick={() => setDialogAbierto(true)}>
            <Plus aria-hidden />
            Nueva API key
          </Button>
        </div>

        {apiKeysIniciales.length === 0 ? (
          <EmptyState titulo="Sin API keys" descripcion="Crea una para que un sistema externo pueda usar /api/v1/…" />
        ) : (
          <div className="space-y-2">
            {apiKeysIniciales.map((k) => (
              <Card key={k.id}>
                <CardContent className="flex items-center justify-between gap-2 p-3">
                  <div>
                    <p className="flex items-center gap-2 text-sm font-medium">
                      <KeyRound className="h-3.5 w-3.5" aria-hidden />
                      {k.nombre}
                      {k.revocadaAt ? <Badge variant="destructive">Revocada</Badge> : <Badge variant="success">Activa</Badge>}
                    </p>
                    <p className="font-codigo text-2xs text-muted-foreground">{k.prefijo}…</p>
                    <p className="text-2xs text-muted-foreground">
                      Alcance: {((k.permisos as string[]) ?? []).join(', ')} · creada {fmtDateTime(k.createdAt)}
                    </p>
                  </div>
                  {!k.revocadaAt ? (
                    <Button variant="ghost" size="icon" title="Revocar" onClick={() => revocar(k.id)}>
                      <ShieldOff className="h-4 w-4 text-destructive" aria-hidden />
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold">Últimos webhooks salientes</h2>
        {webhooks.length === 0 ? (
          <p className="text-xs text-muted-foreground">Todavía no se ha llamado ningún webhook desde el Automatizador.</p>
        ) : (
          <div className="space-y-1.5">
            {webhooks.map((w) => (
              <Card key={w.id}>
                <CardContent className="space-y-0.5 p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="truncate text-2xs">{w.url}</span>
                    <Badge variant={w.ok ? 'success' : 'destructive'}>{w.statusCode ?? 'error'}</Badge>
                  </div>
                  <p className="text-2xs text-muted-foreground">
                    {fmtDateTime(w.createdAt)} {w.error ? `· ${w.error}` : ''}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog
        open={dialogAbierto}
        onOpenChange={(o) => {
          setDialogAbierto(o);
          if (!o) setKeyRecienCreada(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva API key</DialogTitle>
            <DialogDescription>El valor completo solo se muestra una vez — guárdalo ahora.</DialogDescription>
          </DialogHeader>

          {keyRecienCreada ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-[6px] border bg-muted/50 p-2">
                <code className="flex-1 truncate text-xs">{keyRecienCreada}</code>
                <Button size="sm" variant="outline" onClick={copiarKey}>
                  {copiado ? <Check aria-hidden /> : <Copy aria-hidden />}
                  {copiado ? 'Copiado' : 'Copiar'}
                </Button>
              </div>
              <p className="text-2xs text-muted-foreground">No podrás volver a verla — si la pierdes, revoca esta y crea otra.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Nombre</Label>
                <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Integración con el ERP" />
              </div>
              <div className="space-y-1.5">
                <Label>Alcance</Label>
                {ALCANCES_API.map((a) => (
                  <div key={a} className="flex items-center gap-2">
                    <Checkbox checked={alcance.includes(a)} onCheckedChange={() => alternarAlcance(a)} id={`alcance-${a}`} />
                    <Label htmlFor={`alcance-${a}`} className="font-normal">
                      {a}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            {keyRecienCreada ? (
              <Button onClick={() => setDialogAbierto(false)}>Listo</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setDialogAbierto(false)}>
                  Cancelar
                </Button>
                <Button onClick={crear} loading={creando}>
                  Crear
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
