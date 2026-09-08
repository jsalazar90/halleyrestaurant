import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig, loadEnv, Plugin} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

function caseInsensitiveResolverPlugin(): Plugin {
  return {
    name: 'case-insensitive-resolver',
    enforce: 'pre',
    resolveId(source, importer) {
      if (!importer || !source.startsWith('.')) return null;
      const importerDir = path.dirname(importer);
      const targetPath = path.resolve(importerDir, source);

      // Check if exact file or directory exists
      const extensions = ['', '.tsx', '.ts', '.jsx', '.js', '.json'];
      for (const ext of extensions) {
        if (fs.existsSync(targetPath + ext)) {
          return null; // let default resolver handle exact matches
        }
      }

      // If exact match not found (common on case-sensitive Linux/Vercel), search directory case-insensitively
      const targetDir = path.dirname(targetPath);
      const targetBase = path.basename(targetPath).toLowerCase();
      if (fs.existsSync(targetDir)) {
        try {
          const files = fs.readdirSync(targetDir);
          for (const file of files) {
            const ext = path.extname(file);
            const baseName = path.basename(file, ext).toLowerCase();
            if (baseName === targetBase && ['.tsx', '.ts', '.jsx', '.js', '.json'].includes(ext)) {
              return path.join(targetDir, file);
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

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      caseInsensitiveResolverPlugin(),
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        workbox: {
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB Limit
        },
        manifest: {
          name: 'Sistema Contable',
          short_name: 'Contabilidad',
          description: 'Sistema Contable y Administrativo',
          theme_color: '#ffffff',
          display: 'standalone',
          icons: [
            {
              src: 'icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable'
            },
            {
              src: 'icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        }
      })
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || ''),
    },
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), '.'),
      },
    },
    server: {
      watch: {
        ignored: ['**/_backup*/**', '**/dist/**', '**/.git/**']
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâ€”file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
