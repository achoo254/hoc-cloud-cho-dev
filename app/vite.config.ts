import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Proxy target: existing Hono server
const HONO_SERVER = 'http://localhost:3000'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
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
})
