import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  // Base path voor GitHub Pages - wordt ingesteld via environment variable
  base: process.env.GITHUB_PAGES ? '/THG-staal/' : '/',
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    },
    fs: {
      // Allow serving files from the parent directory (for 2D Drawings)
      allow: ['..']
    }
  },
  resolve: {
    alias: {
      '@drawings': path.resolve(__dirname, '../2D Drawings')
    }
  },
  publicDir: 'public'
})
