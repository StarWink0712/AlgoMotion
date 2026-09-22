import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  use: { baseURL: 'http://127.0.0.1:5183', trace: 'retain-on-failure' },
  // Isolated test ports prevent accidentally testing an old developer server.
  webServer: [
    { command: 'node node_modules/tsx/dist/cli.mjs server/index.ts', url: 'http://127.0.0.1:3013/api/health', env: { PORT: '3013', HOST: '127.0.0.1', ALGOMOTION_SETTINGS_MODE: 'memory', LLM_API_KEY: '', LLM_MODEL: '' }, reuseExistingServer: false, timeout: 30_000 },
    { command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5183 --strictPort', url: 'http://127.0.0.1:5183', env: { ALGOMOTION_API_PORT: '3013' }, reuseExistingServer: false, timeout: 30_000 },
  ],
});
