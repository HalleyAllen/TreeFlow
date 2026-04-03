import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import config from './src/config.js'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: config.frontend.port,
    proxy: {
      '/api': {
        target: config.backend.url,
        changeOrigin: true,
        secure: false
      }
    }
  }
})
