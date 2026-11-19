import { defineConfig } from "vitest/config";
import path from "path";
import { readFileSync } from "fs";

// Cargar variables de entorno desde .env.local manualmente
function loadEnvLocal() {
  try {
    const content = readFileSync(path.resolve(__dirname, ".env.local"), "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // .env.local no encontrado, se usan las variables del sistema
  }
}

loadEnvLocal();

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
