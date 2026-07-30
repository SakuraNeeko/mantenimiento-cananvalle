import { describe, expect, it } from 'vitest';
import { PERMISSIONS, PERMISSION_CODES, ROLE_CODES, ROLE_MATRIX, isSensitive } from '@/lib/permissions/catalog';

describe('catálogo de permisos', () => {
  it('no tiene códigos duplicados', () => {
    expect(new Set(PERMISSION_CODES).size).toBe(PERMISSION_CODES.length);
  });

  it('todos los códigos siguen la convención modulo.recurso[.accion]', () => {
    for (const p of PERMISSIONS) {
      expect(p.codigo).toMatch(/^[a-z_]+(\.[a-z_]+){1,2}$/);
    }
  });

  it('la matriz solo referencia permisos existentes', () => {
    const validos = new Set<string>(PERMISSION_CODES);
    for (const rol of ROLE_CODES) {
      for (const permiso of ROLE_MATRIX[rol]) {
        expect(validos.has(permiso), `${rol} referencia un permiso inexistente: ${permiso}`).toBe(true);
      }
    }
  });

  it('ADMIN concentra todos los permisos', () => {
    expect(ROLE_MATRIX.ADMIN.length).toBe(PERMISSION_CODES.length);
  });

  it('AUDITOR no tiene ningún permiso de escritura sensible', () => {
    // `sensible` marca cualquier permiso que exige re-confirmación + auditoría CRITICO — incluye
    // permisos de solo LECTURA de datos delicados (ver costos, ver tarifas), que un auditor de
    // "consulta todo sin capacidad de escritura" sí debe tener. Lo que este test verifica de
    // verdad es que no tenga ninguno de ESCRITURA (gestionar/eliminar/editar/activar/confirmar/
    // ajustar/anular/aprobar/importar…) — un `.ver` sensible no cuenta como escritura.
    const sensiblesDeEscritura = ROLE_MATRIX.AUDITOR.filter(isSensitive).filter((p) => !p.endsWith('.ver'));
    expect(sensiblesDeEscritura).toEqual([]);
  });

  it('SOLIC solo alcanza solicitudes y consulta de activos', () => {
    for (const permiso of ROLE_MATRIX.SOLIC) {
      expect(permiso.startsWith('solicitudes.') || permiso === 'activos.ver').toBe(true);
    }
  });

  it('no existe el permiso ordenes.aprobar (decisión P-02)', () => {
    expect(PERMISSION_CODES).not.toContain('ordenes.aprobar');
  });
});
