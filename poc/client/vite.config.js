import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Configuração básica do Vite com plugin do React e proxy para o backend
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
