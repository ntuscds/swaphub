import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Never load a developer's .env files for the isolated backend suite.
  envDir: false,
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "edge-runtime",
    include: ["tests/integration/convex/**/*.test.ts"],
    setupFiles: ["tests/integration/convex/setup.ts"],
  },
});
