/**
 * Tes E2E (browser sungguhan) untuk alur kritis kasir.
 * Server dijalankan dari hasil build dengan folder data sementara, sehingga setiap
 * jalankan tes dimulai dari instalasi baru yang kosong.
 *   npm run build && npx playwright install chromium && npm run test:e2e
 */
import { defineConfig } from '@playwright/test';
import os from 'node:os';
import path from 'node:path';

const PORT = 4173;
const dataDir = path.join(os.tmpdir(), `pos-e2e-${Date.now()}`);

export default defineConfig({
  testDir: 'e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['github']] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    viewport: { width: 1600, height: 900 },
    locale: 'id-ID',
    timezoneId: 'Asia/Jakarta',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node dist/server.cjs',
    url: `http://127.0.0.1:${PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: { PORT: String(PORT), POS_DATA_DIR: dataDir, NODE_ENV: 'production', GEMINI_API_KEY: '' },
  },
});
