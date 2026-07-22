import type { Express } from "express";
import type { Server } from "http";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "../..");

export async function setupVite(app: Express, server: Server) {
  const { createServer } = await import("vite");
  const vite = await createServer({
    configFile: path.resolve(PROJECT_ROOT, "vite.config.ts"),
    server: {
      middlewareMode: true,
      hmr: { server },
    },
    appType: "spa",
  });
  app.use(vite.middlewares);
}

export function serveStatic(app: Express) {
  const { default: sirv } = require("sirv");
  const distPath = path.resolve(PROJECT_ROOT, "dist/public");
  app.use(sirv(distPath, { single: true }));
}
