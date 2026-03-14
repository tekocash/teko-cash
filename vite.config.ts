import path from 'path'
import { visualizer } from 'rollup-plugin-visualizer'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  define: {
    // Expose Netlify's URL env var to the client so OAuth redirects use the production URL
    'import.meta.env.VITE_SITE_URL': JSON.stringify(process.env.URL || ''),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Teko Cash',
        short_name: 'TekoCash',
        description: 'Aplicación de gestión financiera personal',
        theme_color: '#0066FF',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    }),
    visualizer()
  ],
  server: {
    host: '0.0.0.0'
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-router-dom', 'zustand'],
          'supabase': ['@supabase/supabase-js'],
          'charts': ['chart.js', 'react-chartjs-2']
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
