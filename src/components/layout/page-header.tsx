export function PageHeader({
  titulo,
  descripcion,
  acciones,
}: {
  titulo: string;
  descripcion?: string;
  acciones?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">{titulo}</h1>
        {descripcion ? <p className="text-xs text-muted-foreground">{descripcion}</p> : null}
      </div>
      {acciones ? <div className="flex items-center gap-1.5">{acciones}</div> : null}
    </div>
  );
}
