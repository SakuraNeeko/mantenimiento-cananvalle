import { db } from '@/db';
import { syncConflicts } from '@/db/schema';

/**
 * Registra que una operación offline se aplicó ("última escritura gana",
 * §"Experiencia móvil" del prompt maestro) sobre un valor que ya había
 * cambiado en el servidor mientras el técnico estaba sin conexión. Nunca
 * bloquea la escritura — es solo la bitácora para que se pueda revisar qué
 * se sobrescribió.
 */
export async function registrarConflicto(args: {
  tenantId: string;
  entidad: string;
  entidadId: string;
  campo: string;
  valorServidor: unknown;
  valorCliente: unknown;
  workOrderId?: string;
  userId: string;
}): Promise<void> {
  await db.insert(syncConflicts).values({
    tenantId: args.tenantId,
    entidad: args.entidad,
    entidadId: args.entidadId,
    campo: args.campo,
    valorServidor: args.valorServidor === null || args.valorServidor === undefined ? null : String(args.valorServidor),
    valorCliente: args.valorCliente === null || args.valorCliente === undefined ? null : String(args.valorCliente),
    workOrderId: args.workOrderId,
    userId: args.userId,
  });
}
