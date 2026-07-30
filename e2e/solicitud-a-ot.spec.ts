import { expect, test } from '@playwright/test';

/**
 * Flujo crítico definido en PROMPT_MAESTRO_GMAO.md §12:
 * crear SS → convertir en OT → ejecutar → consumir repuestos → cerrar → verificar kárdex y KPIs.
 *
 * Requiere SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD (usuario con todos los permisos) y datos
 * ya sembrados: al menos un almacén, un responsable disponible, un material sin lote
 * (MAT-0004 — Fusible 30A) y una causa de cierre configurada.
 */
test.describe('flujo crítico: solicitud → OT → ejecución → cierre', () => {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  test.skip(!email || !password, 'Define SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD para esta prueba.');

  test('crea una SS, la convierte en OT, la ejecuta consumiendo un repuesto, la liquida y la cierra', async ({ page }) => {
    test.setTimeout(120_000);
    const marca = `[E2E ${Date.now()}]`;

    // 1. Login
    await page.goto('/login');
    await page.getByLabel('Correo electrónico').fill(email!);
    await page.getByLabel('Contraseña').fill(password!);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    // 2. Crear la solicitud (SS)
    await page.goto('/solicitudes/nueva');
    await page.getByLabel('¿Qué está pasando?').fill(`${marca} Fuga de aceite en el compresor del cuarto frío.`);
    await page.getByRole('button', { name: 'Guardar borrador' }).click();
    await expect(page.getByRole('button', { name: 'Enviar solicitud' })).toBeVisible();
    await page.getByRole('button', { name: 'Enviar solicitud' }).click();
    await expect(page.getByRole('button', { name: 'Aprobar' })).toBeVisible();

    // 3. Aprobar y convertir en OT
    await page.getByRole('button', { name: 'Aprobar' }).click();
    await expect(page.getByRole('button', { name: 'Convertir en OT' })).toBeVisible();
    await page.getByRole('button', { name: 'Convertir en OT' }).click();
    await expect(page).toHaveURL(/\/ordenes\/[0-9a-f-]+$/);
    await expect(page.getByRole('button', { name: 'Planificar' })).toBeVisible();

    // 4. Planificar (fecha + almacén, requerido para consumir materiales)
    await page.getByRole('button', { name: 'Planificar' }).click();
    const dialogPlanificar = page.getByRole('dialog');
    await dialogPlanificar.locator('input[type="date"]').fill('2026-08-01');
    await dialogPlanificar.getByRole('combobox').click();
    await page.getByRole('option').first().click();
    await dialogPlanificar.getByRole('button', { name: 'Planificar' }).click();
    await expect(page.getByRole('button', { name: 'Asignar' })).toBeVisible();

    // 5. Asignar responsable
    await page.getByRole('button', { name: 'Asignar' }).click();
    const dialogAsignar = page.getByRole('dialog');
    await dialogAsignar.getByRole('combobox').click();
    await page.getByRole('option').first().click();
    await dialogAsignar.getByRole('button', { name: 'Asignar' }).click();
    await expect(page.getByRole('button', { name: 'Iniciar ejecución' })).toBeVisible();

    // 6. Iniciar ejecución
    await page.getByRole('button', { name: 'Iniciar ejecución' }).click();
    await expect(page.getByRole('button', { name: 'Marcar ejecutada' })).toBeVisible();

    // 7. Consumir un repuesto
    await page.getByRole('main').getByRole('link', { name: 'Materiales' }).click();
    await expect(page).toHaveURL(/\/materiales$/);
    await page.getByRole('combobox').first().click();
    await page.getByRole('option', { name: /MAT-0004 — Fusible 30A/ }).click();
    await page.locator('input').last().fill('2');
    await page.getByRole('button', { name: 'Solicitar' }).click();
    await expect(page.getByText('MAT-0004 — Fusible 30A')).toBeVisible();

    // 8. Marcar ejecutada
    await page.getByRole('link', { name: 'General' }).click();
    await page.getByRole('button', { name: 'Marcar ejecutada' }).click();
    await expect(page.getByRole('button', { name: 'Firmar (ejecutor)' })).toBeVisible();

    // 9. Firmar como ejecutor (obligatorio antes de liquidar) y liquidar
    await page.getByRole('button', { name: 'Firmar (ejecutor)' }).click();
    await expect(page.getByRole('button', { name: 'Liquidar' })).toBeVisible();
    await page.getByRole('button', { name: 'Liquidar' }).click();
    await expect(page.getByRole('button', { name: 'Cerrar' })).toBeVisible();

    // 10. Cerrar con una causa de cierre
    await page.getByRole('button', { name: 'Cerrar' }).click();
    const dialogCerrar = page.getByRole('dialog');
    await dialogCerrar.getByRole('combobox').click();
    await page.getByRole('option').first().click();
    await dialogCerrar.getByRole('button', { name: 'Cerrar' }).first().click();
    await expect(page.getByText('Cerrada', { exact: true })).toBeVisible();

    // 11. Verificar que el consumo de repuestos generó el movimiento de kárdex correspondiente:
    // la línea pasa a "Liquidado" con un costo real (viene de `kardexMovementId` + costo aplicado
    // por `aplicarLineaKardex`, el mismo motor que usa el módulo de Kárdex).
    await page.getByRole('main').getByRole('link', { name: 'Materiales' }).click();
    await expect(page.getByText('Liquidado', { exact: true })).toBeVisible();
    await expect(page.getByText(/Total liquidado: (?!0\.00)/)).toBeVisible();

    // 12. Verificar que el dashboard sigue respondiendo (KPIs actualizados)
    await page.goto('/dashboard');
    await expect(page.getByText('Órdenes abiertas')).toBeVisible();
  });
});
