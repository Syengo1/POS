import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: "De' Lica POS System",
        short_name: "De' Lica POS",
        description: 'Enterprise Offline-First Point of Sale',
        theme_color: '#0a0a0a', 
        background_color: '#0a0a0a',
        display: 'standalone', 
        orientation: 'portrait', 
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        // Override default 2MB limit to 10MB to allow heavy SVGs to cache
        maximumFileSizeToCacheInBytes: 10000000,
        
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Prevent Workbox from intercepting Supabase network calls
        navigateFallbackDenylist: [/^\/rest\/v1/, /^\/functions\/v1/, /^\/realtime/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/gzsckurvqzmrwfufbuid\.supabase\.co\/.*/i,
            handler: 'NetworkOnly', 
          }
        ]
      }
    })
  ],
  
  build: {
    chunkSizeWarningLimit: 1000, 
    rollupOptions: {
      output: {
        // FIXED: Vite 8 / Rolldown compliant manualChunks function
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'react-vendor';
            }
            if (id.includes('rxdb') || id.includes('rxjs') || id.includes('@supabase')) {
              return 'database-vendor';
            }
            if (id.includes('framer-motion') || id.includes('lucide-react') || id.includes('zustand')) {
              return 'ui-vendor';
            }
            return 'vendor'; // Fallback for all other libraries
          }
        }
      }
    }
  }
});