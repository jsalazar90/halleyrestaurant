var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_vite3 = require("vite");
var import_http = require("http");
var import_path2 = __toESM(require("path"), 1);
var import_fs2 = __toESM(require("fs"), 1);

// vite.config.ts
var import_vite = __toESM(require("@tailwindcss/vite"), 1);
var import_plugin_react = __toESM(require("@vitejs/plugin-react"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_vite2 = require("vite");
var import_vite_plugin_pwa = require("vite-plugin-pwa");
function caseInsensitiveResolverPlugin() {
  return {
    name: "case-insensitive-resolver",
    enforce: "pre",
    resolveId(source, importer) {
      if (!importer || !source.startsWith(".")) return null;
      const importerDir = import_path.default.dirname(importer);
      const targetPath = import_path.default.resolve(importerDir, source);
      const extensions = ["", ".tsx", ".ts", ".jsx", ".js", ".json"];
      for (const ext of extensions) {
        if (import_fs.default.existsSync(targetPath + ext)) {
          return null;
        }
      }
      const targetDir = import_path.default.dirname(targetPath);
      const targetBase = import_path.default.basename(targetPath).toLowerCase();
      if (import_fs.default.existsSync(targetDir)) {
        try {
          const files = import_fs.default.readdirSync(targetDir);
          for (const file of files) {
            const ext = import_path.default.extname(file);
            const baseName = import_path.default.basename(file, ext).toLowerCase();
            if (baseName === targetBase && [".tsx", ".ts", ".jsx", ".js", ".json"].includes(ext)) {
              return import_path.default.join(targetDir, file);
            }
          }
        } catch {
          return null;
        }
      }
      return null;
    }
  };
}
var vite_config_default = (0, import_vite2.defineConfig)(({ mode }) => {
  const env = (0, import_vite2.loadEnv)(mode, ".", "");
  return {
    plugins: [
      caseInsensitiveResolverPlugin(),
      (0, import_plugin_react.default)(),
      (0, import_vite.default)(),
      (0, import_vite_plugin_pwa.VitePWA)({
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
        "@": import_path.default.resolve(process.cwd(), ".")
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
var app = (0, import_express.default)();
app.use(import_express.default.json());
app.get("/api/health", (req, res) => res.json({ status: "ok" }));
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const userConfig = typeof vite_config_default === "function" ? await vite_config_default({ mode: "development", command: "serve" }) : vite_config_default;
    const vite = await (0, import_vite3.createServer)({
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
        let template = import_fs2.default.readFileSync(import_path2.default.resolve(process.cwd(), "index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    const distPath = import_path2.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.use("/data", import_express.default.static(import_path2.default.join(process.cwd(), "data")));
    app.get("*", (req, res) => {
      res.sendFile(import_path2.default.join(distPath, "index.html"));
    });
  }
  const httpServer = (0, import_http.createServer)(app);
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`
\u{1F680} Servidor ERP corriendo en http://localhost:${PORT}
`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
