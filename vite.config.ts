import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import test from "node:test";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./__tests__/setup.ts",
    testTimeout: 10000,
  },
});
