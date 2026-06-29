/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client/src"),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    env: {
      BASE_URL: process.env.BASE_URL || "https://hermeshub.xyz",
    },
  },
});
