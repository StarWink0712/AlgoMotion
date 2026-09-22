import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    server: { port: 5173, strictPort: true, proxy: { '/api': `http://127.0.0.1:${process.env.ALGOMOTION_API_PORT || env.ALGOMOTION_API_PORT || 3001}` } },
  };
});
