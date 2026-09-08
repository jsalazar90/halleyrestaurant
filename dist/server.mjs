// server.ts
import express from "express";
import { createServer as createViteServer } from "vite";
import { createServer as createHttpServer } from "http";
import path2 from "path";
import fs from "fs";

// vite.config.ts
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig, loadEnv } from "vite";
import { VitePWA } from "vite-plugin-pwa";
var vite_config_default = defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: "auto",
        workbox: {
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024
          // 5MB Limit
        },
        manifest: {
          name: "Sistema Contable",
          short_name: "Contabilidad",
          description: "Sistema Contable y Administrativo",
          theme_color: "#ffffff",
          display: "standalone",
          icons: [
            {
              src: "icon-192.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any maskable"
            },
            {
              src: "icon-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any maskable"
            }
          ]
        }
      })
    ],
    define: {
      "process.env.GEMINI_API_KEY": JSON.stringify(env.GEMINI_API_KEY || "")
    },
    resolve: {
      alias: {
        "@": path.resolve(process.cwd(), ".")
      }
    },
    server: {
      watch: {
        ignored: ["**/_backup*/**", "**/dist/**", "**/.git/**"]
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâ€”file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== "true"
    }
  };
});

// server.ts
var PORT = 3e3;
var app = express();
app.use(express.json());
app.get("/api/health", (req, res) => res.json({ status: "ok" }));
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const userConfig = typeof vite_config_default === "function" ? await vite_config_default({ mode: "development", command: "serve" }) : vite_config_default;
    const vite = await createViteServer({
      ...userConfig,
      configFile: false,
      server: {
        ...userConfig.server || {},
        middlewareMode: true
      },
      appType: "custom"
    });
    app.use(vite.middlewares);
    app.get("*", async (req, res, next) => {
      if (req.originalUrl.startsWith("/api")) return next();
      try {
        const url = req.originalUrl;
        let template = fs.readFileSync(path2.resolve(process.cwd(), "index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    const distPath = path2.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.use("/data", express.static(path2.join(process.cwd(), "data")));
    app.get("*", (req, res) => {
      res.sendFile(path2.join(distPath, "index.html"));
    });
  }
  const httpServer = createHttpServer(app);
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`
\u{1F680} Servidor ERP corriendo en http://localhost:${PORT}
`);
  });
}
startServer();
