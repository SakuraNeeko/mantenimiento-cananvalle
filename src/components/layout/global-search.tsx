'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { buscarGlobal, type ResultadoBusqueda } from '@/app/(app)/_lib/busqueda-global';

/** Buscador global — antes decía "Fase 2" y estaba deshabilitado desde la Fase 1. */
export function GlobalSearch() {
  const router = useRouter();
  const [abierto, setAbierto] = React.useState(false);
  const [texto, setTexto] = React.useState('');
  const [textoConsultado, setTextoConsultado] = React.useState('');
  const [resultados, setResultados] = React.useState<ResultadoBusqueda[]>([]);

  React.useEffect(() => {
    function alTeclear(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setAbierto((v) => !v);
      }
    }
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, []);

  const consultaValida = texto.trim().length >= 2;
  const buscando = consultaValida && textoConsultado !== texto;

  React.useEffect(() => {
    if (!consultaValida) return;
    const t = setTimeout(() => {
      buscarGlobal(texto)
        .then(setResultados)
        .catch(() => setResultados([]))
        .finally(() => setTextoConsultado(texto));
    }, 250);
    return () => clearTimeout(t);
  }, [texto, consultaValida]);

  function cambiarAbierto(v: boolean) {
    setAbierto(v);
    if (!v) {
      setTexto('');
      setTextoConsultado('');
      setResultados([]);
    }
  }

  function ir(r: ResultadoBusqueda) {
    cambiarAbierto(false);
    router.push(r.href);
  }

  const resultadosVisibles = React.useMemo(() => (consultaValida ? resultados : []), [consultaValida, resultados]);

  const grupos = React.useMemo(() => {
    const mapa = new Map<string, ResultadoBusqueda[]>();
    for (const r of resultadosVisibles) {
      if (!mapa.has(r.grupo)) mapa.set(r.grupo, []);
      mapa.get(r.grupo)!.push(r);
    }
    return [...mapa.entries()];
  }, [resultadosVisibles]);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="ml-2 hidden min-w-[16rem] justify-start text-muted-foreground md:inline-flex"
        onClick={() => setAbierto(true)}
      >
        <Search aria-hidden />
        Buscar activos, OT, materiales…
        <kbd className="ml-auto font-codigo text-2xs">⌘K</kbd>
      </Button>

      <Dialog open={abierto} onOpenChange={cambiarAbierto}>
        <DialogContent className="max-w-lg gap-0 p-0">
          <DialogTitle className="sr-only">Buscar</DialogTitle>
          <div className="flex items-center gap-2 border-b px-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <Input
              autoFocus
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Buscar activos, órdenes, materiales, solicitudes…"
              className="border-0 shadow-none focus-visible:ring-0"
            />
            {buscando ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" aria-hidden /> : null}
          </div>

          <div className="max-h-96 overflow-y-auto p-1">
            {!consultaValida ? (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">Escribe al menos 2 caracteres…</p>
            ) : !buscando && resultadosVisibles.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">Sin resultados para &quot;{texto}&quot;.</p>
            ) : (
              grupos.map(([grupo, filas]) => (
                <div key={grupo} className="mb-1">
                  <p className="px-2 py-1 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">{grupo}</p>
                  {filas.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => ir(r)}
                      className="flex w-full flex-col items-start gap-0 rounded-[6px] px-2 py-1.5 text-left hover:bg-accent"
                    >
                      <span className="line-clamp-1 text-sm">{r.titulo}</span>
                      <span className="font-codigo text-2xs text-muted-foreground">{r.subtitulo}</span>
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
