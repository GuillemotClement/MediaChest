import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  projects: [
    { name: "desktop", use: { viewport: { width: 1280, height: 800 } } },
    { name: "mobile", use: { viewport: { width: 390, height: 844 }, isMobile: true } },
  ],
  use: { baseURL: "http://localhost:5174", trace: "retain-on-failure" },
  webServer: [
    {
      command: "node scripts/e2e-server.js",
      cwd: fileURLToPath(new URL("../api", import.meta.url)),
      url: "http://127.0.0.1:3001/api/health",
      env: { PORT: "3001", BETTER_AUTH_URL: "http://localhost:3001", FRONTEND_URL: "http://localhost:5174" },
      reuseExistingServer: false,
      gracefulShutdown: { signal: "SIGTERM", timeout: 10000 },
    },
    {
      command: "node node_modules/vite/bin/vite.js --port 5174",
      url: "http://localhost:5174",
      env: { API_PROXY_TARGET: "http://127.0.0.1:3001" },
      reuseExistingServer: false,
      gracefulShutdown: { signal: "SIGTERM", timeout: 10000 },
    },
  ],
});
