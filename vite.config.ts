// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    watch: {
      usePolling: true,
    },
    hmr: {
      protocol: 'ws',
      host: '0.0.0.0',
      port: 3000,
    },
  },
  build: {
    rollupOptions: {
      // УДАЛИТЕ ИЛИ ЗАКОММЕНТИРУЙТЕ СЛЕДУЮЩУЮ СТРОКУ:
      // external: ['react/jsx-runtime']
    },
  },
  // ДОБАВЬТЕ ЭТУ СЕКЦИЮ:
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
});