import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
// import { visualizer } from 'rollup-plugin-visualizer'  // DESABILITADO TEMPORARIAMENTE

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],  // Removido visualizer temporariamente
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),  // Usar resolve do path como no business-center
    },
  },
  server: {
    port: 5173,  // Porta padrão do Vite
    host: '0.0.0.0',
    strictPort: false,
    allowedHosts: [
      'crm.quadradois.com.br',
      'localhost',
      '127.0.0.1'
    ],
    hmr: {
      overlay: false,
    },
    watch: {
      // Detectar mudanças em arquivos
      usePolling: true,
    },
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:5000',
        changeOrigin: true,
        secure: false
      },
      '/auth': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:5000',
        changeOrigin: true,
        secure: false
      },
      '/integrations': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:5000',
        changeOrigin: true,
        secure: false
      },
      '/canalpro': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:5000',
        changeOrigin: true,
        secure: false
      },
      '/admin': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:5000',
        changeOrigin: true,
        secure: false
      }
    },
    // Configurações adicionais para evitar problemas de binding
    fs: {
      strict: false
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    // Removido manualChunks para evitar importação circular
    // Vite irá gerenciar automaticamente a divisão de chunks
    rollupOptions: {
      output: {
        // Chunking automático do Vite
      },
    },
    chunkSizeWarningLimit: 800,
  },
})
