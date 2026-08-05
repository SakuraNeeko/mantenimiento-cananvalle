import type { CampoDefPublico } from '@/lib/catalogs/registry';

/**
 * No incluye `parentId` (despiece): resolver padres por código dentro del
 * mismo lote implicaría orden topológico y auto-referencias que no valen la
 * pena para la carga masiva — se asigna manualmente desde la ficha.
 */
export const ACTIVO_IMPORT_CAMPOS: CampoDefPublico[] = [
  { name: 'codigo', label: 'Código', tipo: 'texto', requerido: true },
  { name: 'nombre', label: 'Nombre', tipo: 'texto', requerido: true },
  { name: 'claseId', label: 'Clase', tipo: 'referencia', requerido: true },
  {
    name: 'criticidad',
    label: 'Criticidad',
    tipo: 'enum',
    requerido: true,
    opciones: [
      { value: 'A', label: 'A' },
      { value: 'B', label: 'B' },
      { value: 'C', label: 'C' },
    ],
  },
  { name: 'locationId', label: 'Ubicación', tipo: 'referencia' },
  { name: 'costCenterId', label: 'Centro de costo', tipo: 'referencia' },
  { name: 'responsibleCenterId', label: 'Centro responsable', tipo: 'referencia' },
  { name: 'fabricante', label: 'Fabricante', tipo: 'texto' },
  { name: 'modelo', label: 'Modelo', tipo: 'texto' },
  { name: 'serie', label: 'Serie', tipo: 'texto' },
  { name: 'anio', label: 'Año', tipo: 'numero' },
  { name: 'fechaCompra', label: 'Fecha de compra', tipo: 'fecha' },
  { name: 'valorCompra', label: 'Valor de compra', tipo: 'decimal' },
  { name: 'valorActual', label: 'Valor actual', tipo: 'decimal' },
  { name: 'vidaUtilMeses', label: 'Vida útil (meses)', tipo: 'numero' },
  { name: 'garantiaFin', label: 'Garantía hasta', tipo: 'fecha' },
  { name: 'diasAlertaGarantia', label: 'Días de alerta antes de vencer', tipo: 'numero' },
  { name: 'partyId', label: 'Proveedor', tipo: 'referencia' },
  { name: 'contractId', label: 'Contrato', tipo: 'referencia' },
  { name: 'descripcion', label: 'Descripción', tipo: 'textarea' },
  { name: 'activo', label: 'Activo', tipo: 'booleano' },
];
