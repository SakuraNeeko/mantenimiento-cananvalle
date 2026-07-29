import type { Metadata } from 'next';
import { eq } from 'drizzle-orm';
import { Check, Lock, Minus } from 'lucide-react';
import { db } from '@/db';
import { rolePermissions, roles } from '@/db/schema';
import { requirePermission } from '@/lib/permissions';
import { getCurrentTenant } from '@/lib/tenant';
import { PERMISSIONS, isSensitive } from '@/lib/permissions/catalog';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export const metadata: Metadata = { title: 'Roles y permisos' };

export default async function RolesPage() {
  await requirePermission('admin.roles.gestionar');
  const tenant = await getCurrentTenant();

  const [rolesDb, asignaciones] = await Promise.all([
    db.select().from(roles).where(eq(roles.tenantId, tenant.id)).orderBy(roles.codigo),
    db
      .select({ roleId: rolePermissions.roleId, permiso: rolePermissions.permissionCode })
      .from(rolePermissions)
      .innerJoin(roles, eq(roles.id, rolePermissions.roleId))
      .where(eq(roles.tenantId, tenant.id)),
  ]);

  const concedido = new Set(asignaciones.map((a) => `${a.roleId}|${a.permiso}`));

  const modulos = [...new Set(PERMISSIONS.map((p) => p.modulo))];

  return (
    <div className="space-y-3">
      <PageHeader
        titulo="Roles y permisos"
        descripcion={`${rolesDb.length} roles · ${PERMISSIONS.length} permisos. Los marcados con candado exigen re-confirmación y quedan en auditoría como críticos.`}
      />

      <div className="flex flex-wrap gap-2">
        {rolesDb.map((r) => (
          <Card key={r.id} className="min-w-[12rem] flex-1">
            <CardContent className="space-y-1 p-3">
              <div className="flex items-center gap-2">
                <span className="font-codigo text-xs font-semibold">{r.codigo}</span>
                {r.esSistema ? <Badge variant="neutral">Sistema</Badge> : null}
              </div>
              <p className="text-sm font-medium">{r.nombre}</p>
              <p className="text-2xs text-muted-foreground">{r.descripcion}</p>
              <Badge variant="info">Alcance {r.scopeDefault}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="max-h-[70vh] overflow-auto densidad-compacta">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[22rem]">Permiso</TableHead>
                {rolesDb.map((r) => (
                  <TableHead key={r.id} className="text-center">
                    {r.codigo}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {modulos.map((modulo) => (
                <>
                  <TableRow key={`m-${modulo}`} className="bg-muted/50">
                    <TableCell colSpan={rolesDb.length + 1} className="py-1 text-xs font-semibold">
                      {modulo}
                    </TableCell>
                  </TableRow>
                  {PERMISSIONS.filter((p) => p.modulo === modulo).map((p) => (
                    <TableRow key={p.codigo}>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {isSensitive(p.codigo) ? (
                            <Lock className="h-3 w-3 shrink-0 text-warning" aria-label="Permiso sensible" />
                          ) : (
                            <span className="w-3" />
                          )}
                          <span className="font-codigo text-2xs text-muted-foreground">{p.codigo}</span>
                          <span className="text-xs">{p.descripcion}</span>
                        </div>
                      </TableCell>
                      {rolesDb.map((r) => (
                        <TableCell key={`${r.id}-${p.codigo}`} className="text-center">
                          {concedido.has(`${r.id}|${p.codigo}`) ? (
                            <Check className="mx-auto h-3.5 w-3.5 text-success" aria-label="Concedido" />
                          ) : (
                            <Minus className="mx-auto h-3.5 w-3.5 text-muted-foreground/40" aria-label="Denegado" />
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
