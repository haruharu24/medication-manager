import fs from 'fs';
import { defineConfig, devices } from '@playwright/test';
import { APP_PORT, SERVER_PORT, REVENUECAT_WEBHOOK_SECRET } from './e2e/testConfig';

// Fixed test-only VAPID keypair for the push server started by webServer below.
// Never used to send a real push — E2E tests stub/skip anything that would.
const TEST_VAPID_PUBLIC_KEY = 'BAsiBc8yWqg9pWJJfgKl1yNQIpTitsAS65SNOECH9IoLkCGiqMhhbm59ZNsF0icuRLlQuKYhXoODJ8lLclxbQ2I';
const TEST_VAPID_PRIVATE_KEY = 'Xs3xxSIj_d2qDWUd6GUGHuMRoiCp0OOwcYjEgFM58bI';

// This sandbox ships a pre-installed Chromium at a fixed path (see repo/environment
// docs) instead of the one `playwright install` would fetch. Use it only when it's
// actually present; real CI runners install their own via `playwright install
// --with-deps chromium` and should use Playwright's normal browser resolution.
const SANDBOX_CHROMIUM_PATH = '/opt/pw-browsers/chromium';
const chromiumExecutablePath =
  process.env.PLAYWRIGHT_CHROMIUM_PATH ||
  (fs.existsSync(SANDBOX_CHROMIUM_PATH) ? SANDBOX_CHROMIUM_PATH : undefined);

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${APP_PORT}`,
    trace: 'retain-on-failure',
    // Most specs exercise a specific feature and don't care about the first-run
    // onboarding overlay, which would otherwise block every interaction on a
    // fresh context. Pre-seed localStorage so it's already dismissed; the
    // onboarding spec itself opts back out of this fixture to test it for real.
    storageState: './e2e/fixtures/onboarding-completed.json',
  },
  projects: [
    {
      // The app is a mobile-only layout (max-w-md); a phone-sized viewport is
      // both more representative and avoids desktop-viewport scroll/overlay
      // edge cases the fixed-position bottom nav/footer aren't designed for.
      name: 'mobile-chromium',
      use: {
        ...devices['Pixel 7'],
        launchOptions: chromiumExecutablePath ? { executablePath: chromiumExecutablePath } : {},
      },
    },
  ],
  webServer: [
    {
      command: `node index.js`,
      cwd: './server',
      port: SERVER_PORT,
      reuseExistingServer: !process.env.CI,
      env: {
        PORT: String(SERVER_PORT),
        PUBLIC_SERVER_URL: `http://localhost:${SERVER_PORT}`,
        CORS_ORIGIN: `http://localhost:${APP_PORT}`,
        VAPID_PUBLIC_KEY: TEST_VAPID_PUBLIC_KEY,
        VAPID_PRIVATE_KEY: TEST_VAPID_PRIVATE_KEY,
        VAPID_SUBJECT: 'mailto:test@example.com',
        JWT_SECRET: 'e2e-test-secret-do-not-use-in-prod',
        REVENUECAT_WEBHOOK_SECRET,
        MEDIMATE_DATA_DIR: process.env.MEDIMATE_DATA_DIR || '/tmp/medimate-e2e-server-data',
      },
    },
    {
      command: `npx vite --port ${APP_PORT} --strictPort`,
      port: APP_PORT,
      reuseExistingServer: !process.env.CI,
      env: {
        GEMINI_API_KEY: 'e2e-test-key',
        VITE_PUSH_SERVER_URL: `http://localhost:${SERVER_PORT}`,
      },
    },
  ],
});
