import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

declare const process: { env?: Record<string, string | undefined> }

const backendTarget = (process.env?.VITE_BACKEND_URL) || 'http://localhost:5000'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  server: {
    port: 4000,
    host: '0.0.0.0',
    allowedHosts: [
      'app.quadradois.com.br',
      'localhost',
      '127.0.0.1'
    ],
    proxy: {
      '/api': {
        target: backendTarget,
        changeOrigin: true,
        secure: false,
      },
      '/auth': {
        target: backendTarget,
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'router': ['react-router-dom'],
          'state': ['zustand'],
          'ui': ['lucide-react', 'framer-motion'],
          'charts': ['recharts'],
          'utils': ['date-fns', 'clsx', 'tailwind-merge']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  },
  preview: {
    port: 3001
  }
})