import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({ 
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true // This allows you to test the PWA installation while running localhost
      },
      manifest: {
        name: 'Premium POS',
        short_name: 'POS',
        theme_color: '#0a0a0a', // Your luxury dark theme background
        display: 'standalone'
      }
    })
  ],
});