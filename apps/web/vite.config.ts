import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
    hmr: {
      // Explicitly bind HMR to localhost so the browser WebSocket
      // always connects to the correct interface, regardless of
      // which network adapter 'host: true' bound the server to.
      host: 'localhost',
      port: 5173,
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'lucide-react',
      'recharts',
      'tesseract.js',
      'jspdf',
      'jspdf-autotable',
      'i18next',
      'react-i18next',
      'i18next-browser-languagedetector',
    ],
  },
})

