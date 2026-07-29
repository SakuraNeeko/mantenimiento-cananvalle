import { expect, test } from '@playwright/test';

test.describe('autenticación', () => {
  test('rechaza credenciales inválidas con un mensaje genérico', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Correo electrónico').fill('noexiste@ejemplo.com');
    await page.getByLabel('Contraseña').fill('claveIncorrecta1!');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByRole('alert')).toContainText('incorrectos');
  });

  test('redirige al login cualquier ruta protegida', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('inicia sesión y muestra el dashboard', async ({ page }) => {
    const email = process.env.SEED_ADMIN_EMAIL;
    const password = process.env.SEED_ADMIN_PASSWORD;
    test.skip(!email || !password, 'Define SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD para esta prueba.');

    await page.goto('/login');
    await page.getByLabel('Correo electrónico').fill(email!);
    await page.getByLabel('Contraseña').fill(password!);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole('navigation', { name: 'Navegación principal' })).toBeVisible();
  });
});
