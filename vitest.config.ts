import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/.next/**"],
    coverage: {
      reporter: ["text", "html"],
      exclude: ["node_modules/", "vitest.setup.ts"],
    },
  },
  resolve: {
    alias: {
      "@": "/Users/euanmorgan/Dev/learning/hitster/src",
    },
  },
});
