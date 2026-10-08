import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Configuración de desarrollo con proxy inverso hacia paqtracker-api (Spring Boot en puerto 3000)
// Esto replica el comportamiento del Nginx de producción (DA-06) y evita problemas de CORS.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: 'ws://127.0.0.1:3000',
        ws: true,
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
