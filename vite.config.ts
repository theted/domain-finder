import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    proxy: { "/api": "http://127.0.0.1:5000" },
  },
  test: {
    projects: [
      {
        extends: true,
        test: { name: "server", environment: "node", include: ["server/**/*.test.ts", "shared/**/*.test.ts"] },
      },
      {
        extends: true,
        test: { name: "web", environment: "jsdom", include: ["src/**/*.test.tsx"], setupFiles: ["src/test-setup.ts"] },
      },
    ],
  },
});
