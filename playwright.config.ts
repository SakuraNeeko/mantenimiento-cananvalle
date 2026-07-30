import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  expect: { timeout: 10_000 },
  use: {
    baseURL: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    locale: 'es-EC',
    timezoneId: 'America/Guayaquil',
    navigationTimeout: 15_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Contra un build de producción, no contra `next dev`: en dev, Turbopack compila cada ruta
  // "en frío" la primera vez que se visita, y esa demora (a veces >30 s) hace flaky cualquier
  // aserción con timeout normal en un flujo largo como el de solicitud-a-ot.spec.ts.
  webServer: {
    command: 'pnpm build && pnpm start',
    url: 'http://localhost:3000/login',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
