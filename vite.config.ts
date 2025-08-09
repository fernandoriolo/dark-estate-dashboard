import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8081,
    strictPort: true, // Não trocar de porta se 8081 estiver ocupada
    proxy: {
      '/api/webhook': {
        target: 'https://webhooklabz.n8nlabz.com.br',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/webhook/, '/webhook'),
        secure: true,
        headers: {
          'Origin': 'https://webhooklabz.n8nlabz.com.br'
        }
      }
    }
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: ['react-pdf'],
  },
  build: {
    rollupOptions: {
      external: [],
      output: {
        manualChunks: {
          'react-pdf': ['react-pdf', 'pdfjs-dist'],
        },
      },
    },
  },
  define: {
    global: 'globalThis',
  },
}));
