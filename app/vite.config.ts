import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { visualizer } from 'rollup-plugin-visualizer'

// Proxy target: existing Hono server
const HONO_SERVER = 'http://localhost:3000'

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    // Bundle visualizer — only when VITE_ANALYZE=1 is set.
    // Output: dist/stats.html — open in browser to inspect chunk composition.
    ...(process.env['VITE_ANALYZE'] === '1'
      ? [visualizer({ open: false, filename: 'dist/stats.html', gzipSize: true, brotliSize: true })]
      : []),
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  build: {
    rollupOptions: {
      output: {
        /**
         * Manual chunk splitting strategy:
         *   mermaid   — large diagram library (~1.5 MB raw), lazy-loaded per lab
         *   shiki     — syntax highlighter (~1 MB raw), lazy-loaded per lab
         *   react-vendor — react + react-dom + react-router (stable, long cache)
         *   query-vendor — @tanstack/react-query (stable)
         *   framer    — framer-motion (animation, large)
         *   ui-vendor — radix-ui + cmdk (shadcn primitives)
         */
        manualChunks(id: string): string | undefined {
          // Heavy async libs — must stay isolated so code-split lazy imports work
          if (id.includes('node_modules/mermaid')) return 'mermaid'
          if (id.includes('node_modules/shiki'))   return 'shiki'

          // Animation library
          if (id.includes('node_modules/framer-motion')) return 'framer'

          // React ecosystem (stable, high cache hit rate)
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/react-router') ||
            id.includes('node_modules/scheduler/')
          ) return 'react-vendor'

          // Data-fetching
          if (id.includes('node_modules/@tanstack/')) return 'query-vendor'

          // Radix UI + cmdk primitives
          if (id.includes('node_modules/@radix-ui/') || id.includes('node_modules/cmdk/')) {
            return 'ui-vendor'
          }
        },
      },
    },
  },

  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: HONO_SERVER,
        changeOrigin: true,
        ws: false,
      },
      '/healthz': {
        target: HONO_SERVER,
        changeOrigin: true,
      },
      '/sse': {
        target: HONO_SERVER,
        changeOrigin: true,
        ws: false,
      },
    },
  },
}))
