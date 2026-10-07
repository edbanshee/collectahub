import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ command }) => {
  // Use relative base './' for production build so it works seamlessly on ANY repository name
  // or URL capitalization (e.g. /CollectaHub/, /collectahub/, root domain) without 404 asset errors.
  const base = process.env.VITE_BASE_PATH || (command === 'build' ? './' : '/');

  return {
    base,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname ?? __dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio to prevent WebSocket closed errors
      hmr: false,
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      chunkSizeWarningLimit: 1600,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/firebase')) {
              return 'vendor-firebase';
            }
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
              return 'vendor-react';
            }
            if (id.includes('node_modules/lucide-react')) {
              return 'vendor-lucide';
            }
          },
        },
      },
    },
  };
});
