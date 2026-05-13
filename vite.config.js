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
        theme_color: '#0a0a0a', // Matches your neutral-950 UI
        background_color: '#0a0a0a',
        display: 'standalone', // This hides the browser UI (URL bar, tabs)
        orientation: 'landscape', // Force landscape for POS tablets
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
        // Cache the UI shell heavily
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // CRITICAL: Tell Workbox to ignore Supabase API calls. 
        // RxDB handles our data offline, Workbox only handles the UI!
        navigateFallbackDenylist: [/^\/rest\/v1/, /^\/functions\/v1/, /^\/realtime/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/gzsckurvqzmrwfufbuid\.supabase\.co\/.*/i,
            handler: 'NetworkOnly', // Never cache Supabase network requests in the Service Worker
          }
        ]
      }
    })
  ]
});