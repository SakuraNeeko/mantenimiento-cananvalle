/**
 * Tipos y lógica pura del Automatizador (Fase 12, §4.12) — sin tocar la
 * base de datos, así que este archivo es seguro de importar tanto desde el
 * servidor como desde el formulario de reglas en el cliente. La consulta a
 * la base de datos por cada disparador vive en `motor.ts` (servidor).
 */

export const OPERADORES_CONDICION = ['=', '!=', '>', '<', '>=', '<=', 'contiene'] as const;
export type OperadorCondicion = (typeof OPERADORES_CONDICION)[number];

export type CondicionSimple = { campo: string; operador: OperadorCondicion; valor: string };
export type CondicionesRegla = { operador: 'AND' | 'OR'; reglas: CondicionSimple[] };

export type AccionRegla =
  | { tipo: 'EMAIL'; destinatarios: string; asunto: string; cuerpo: string }
  | { tipo: 'NOTIFICACION'; userId: string; titulo: string; cuerpo?: string }
  | { tipo: 'CREAR_OT'; descripcionProblema: string; prioridad?: string }
  | { tipo: 'CAMBIAR_RESPONSABLE'; responsableUserId: string }
  | { tipo: 'ESCALAR_PRIORIDAD' }
  | { tipo: 'WEBHOOK'; url: string };

export const TIPOS_ACCION = ['EMAIL', 'NOTIFICACION', 'CREAR_OT', 'CAMBIAR_RESPONSABLE', 'ESCALAR_PRIORIDAD', 'WEBHOOK'] as const;

export const DISPARADOR_LABELS: Record<string, string> = {
  OT_CREADA: 'Se crea una orden de trabajo',
  OT_CAMBIO_ESTADO: 'Una orden de trabajo cambia de estado',
  SS_CREADA: 'Se crea una solicitud de servicio',
  MEDIDOR_FUERA_RANGO: 'Una lectura de medidor sale de su rango normal',
  STOCK_BAJO_MINIMO: 'Un material queda bajo su mínimo',
  OT_VENCIDA: 'Una orden de trabajo se vence (pasó su fecha programada sin cerrar)',
  CONTRATO_POR_VENCER: 'Un contrato está por vencer',
  PARO_EXCEDE_HORAS: 'Un paro lleva abierto más de X horas',
};

export const ACCION_LABELS: Record<string, string> = {
  EMAIL: 'Enviar un correo',
  NOTIFICACION: 'Notificar dentro del sistema',
  CREAR_OT: 'Crear una orden de trabajo',
  CAMBIAR_RESPONSABLE: 'Cambiar el responsable de la OT',
  ESCALAR_PRIORIDAD: 'Escalar la prioridad de la OT un nivel',
  WEBHOOK: 'Llamar un webhook',
};

/** Campos seleccionables en el constructor de condiciones, según el disparador — evita mostrar "Prioridad" para un contrato. */
export const CAMPOS_POR_DISPARADOR: Record<string, { value: string; label: string }[]> = {
  OT_CREADA: [
    { value: 'prioridad', label: 'Prioridad' },
    { value: 'criticidad', label: 'Criticidad' },
    { value: 'origen', label: 'Origen' },
  ],
  OT_CAMBIO_ESTADO: [
    { value: 'estadoNuevo', label: 'Estado nuevo' },
    { value: 'prioridad', label: 'Prioridad' },
    { value: 'criticidad', label: 'Criticidad' },
  ],
  SS_CREADA: [
    { value: 'prioridad', label: 'Prioridad' },
    { value: 'estado', label: 'Estado' },
  ],
  MEDIDOR_FUERA_RANGO: [
    { value: 'valor', label: 'Valor de la lectura' },
    { value: 'rangoMin', label: 'Rango mínimo del activo' },
    { value: 'rangoMax', label: 'Rango máximo del activo' },
  ],
  STOCK_BAJO_MINIMO: [
    { value: 'cantidad', label: 'Cantidad actual' },
    { value: 'minimo', label: 'Mínimo configurado' },
  ],
  OT_VENCIDA: [
    { value: 'diasVencida', label: 'Días de vencida' },
    { value: 'prioridad', label: 'Prioridad' },
  ],
  CONTRATO_POR_VENCER: [
    { value: 'diasParaVencer', label: 'Días para vencer' },
    { value: 'monto', label: 'Monto del contrato' },
  ],
  PARO_EXCEDE_HORAS: [
    { value: 'horasAbierto', label: 'Horas abierto' },
    { value: 'tipo', label: 'Tipo de paro' },
  ],
};

/** Disparadores donde `umbral` tiene sentido (paro que excede X horas) y se muestra en el formulario. */
export const DISPARADORES_CON_UMBRAL = new Set(['PARO_EXCEDE_HORAS']);

/** `condiciones.reglas` vacío = sin filtro, todo candidato del disparador dispara la regla. */
export function evaluarCondiciones(fila: Record<string, unknown>, condiciones: CondicionesRegla): boolean {
  if (!condiciones.reglas || condiciones.reglas.length === 0) return true;
  const resultados = condiciones.reglas.map((regla) => evaluarUnaCondicion(fila, regla));
  return condiciones.operador === 'OR' ? resultados.some(Boolean) : resultados.every(Boolean);
}

function evaluarUnaCondicion(fila: Record<string, unknown>, { campo, operador, valor }: CondicionSimple): boolean {
  const actual = fila[campo];
  switch (operador) {
    case '=':
      return String(actual ?? '') === valor;
    case '!=':
      return String(actual ?? '') !== valor;
    case '>':
      return Number(actual) > Number(valor);
    case '<':
      return Number(actual) < Number(valor);
    case '>=':
      return Number(actual) >= Number(valor);
    case '<=':
      return Number(actual) <= Number(valor);
    case 'contiene':
      return String(actual ?? '').toLowerCase().includes(valor.toLowerCase());
    default:
      return false;
  }
}
