'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { fmtDate } from '@/lib/datetime';
import { confirmarGeneracionManual, previsualizarGeneracion } from './actions';
import type { Candidato } from '@/lib/planes/generador';

const RESULTADO_LABELS: Record<Candidato['resultado'], string> = {
  GENERADA: 'Lista para generar',
  OMITIDA_DUPLICADO: 'Ya hay una OT abierta',
  OMITIDA_SIN_PROYECCION: 'Sin datos para proyectar',
};

const RESULTADO_VARIANT: Record<Candidato['resultado'], 'success' | 'neutral' | 'warning'> = {
  GENERADA: 'success',
  OMITIDA_DUPLICADO: 'neutral',
  OMITIDA_SIN_PROYECCION: 'warning',
};

export function GenerarClient() {
  const router = useRouter();
  const [candidatos, setCandidatos] = React.useState<Candidato[] | null>(null);
  const [seleccion, setSeleccion] = React.useState<Set<string>>(new Set());
  const [cargando, setCargando] = React.useState(false);
  const [confirmando, setConfirmando] = React.useState(false);

  async function analizar() {
    setCargando(true);
    try {
      const resultado = await previsualizarGeneracion();
      setCandidatos(resultado);
      setSeleccion(new Set(resultado.filter((c) => c.resultado === 'GENERADA').map((c) => c.key)));
    } catch {
      toast.error('No se pudo analizar los planes.');
    } finally {
      setCargando(false);
    }
  }

  React.useEffect(() => {
    analizar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function alternar(key: string) {
    setSeleccion((prev) => {
      const copia = new Set(prev);
      if (copia.has(key)) copia.delete(key);
      else copia.add(key);
      return copia;
    });
  }

  async function confirmar() {
    setConfirmando(true);
    const resultado = await confirmarGeneracionManual(Array.from(seleccion));
    setConfirmando(false);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    toast.success(`${resultado.generadas} orden(es) generada(s).`);
    router.push('/ordenes?vista=kanban');
  }

  const generables = candidatos?.filter((c) => c.resultado === 'GENERADA') ?? [];
  const omitidos = candidatos?.filter((c) => c.resultado !== 'GENERADA') ?? [];

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="outline" onClick={analizar} loading={cargando}>
          <RefreshCw aria-hidden />
          Volver a analizar
        </Button>
      </div>

      {!candidatos ? null : candidatos.length === 0 ? (
        <EmptyState icon={Sparkles} titulo="No hay nada que generar por ahora" descripcion="Ningún plan activo tiene disparadores dentro de su ventana de anticipación." />
      ) : (
        <>
          {generables.length > 0 ? (
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle>Listas para generar ({generables.length})</CardTitle>
                <Button onClick={confirmar} loading={confirmando} disabled={seleccion.size === 0}>
                  <Sparkles aria-hidden />
                  Generar {seleccion.size} orden(es)
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {generables.map((c) => (
                  <label key={c.key} className="flex items-start gap-2 rounded-[6px] border p-2 text-sm">
                    <Checkbox checked={seleccion.has(c.key)} onCheckedChange={() => alternar(c.key)} className="mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{c.planCodigo}</span>
                        <span className="text-muted-foreground">{c.assetCodigo} — {c.assetNombre}</span>
                        <Badge variant={RESULTADO_VARIANT[c.resultado]}>{RESULTADO_LABELS[c.resultado]}</Badge>
                      </div>
                      <p className="text-2xs text-muted-foreground">
                        {c.motivo} {c.fechaProbable ? `· Fecha probable: ${fmtDate(c.fechaProbable)}` : ''}
                      </p>
                    </div>
                  </label>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {omitidos.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Omitidas ({omitidos.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {omitidos.map((c) => (
                  <div key={c.key} className="rounded-[6px] border p-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{c.planCodigo}</span>
                      <span className="text-muted-foreground">{c.assetCodigo} — {c.assetNombre}</span>
                      <Badge variant={RESULTADO_VARIANT[c.resultado]}>{RESULTADO_LABELS[c.resultado]}</Badge>
                    </div>
                    <p className="text-2xs text-muted-foreground">{c.motivo}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}
