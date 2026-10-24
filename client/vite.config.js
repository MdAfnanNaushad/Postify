import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const rootDir = import.meta.dirname ? path.resolve(import.meta.dirname, '..') : path.resolve(process.cwd(), '..');
  const env = loadEnv(mode, rootDir, '');
  const adminRoute = env.ADMIN_ROUTE || env.VITE_ADMIN_ROUTE || '/admin-portal';
  let cleanRoute = String(adminRoute).trim();
  if (!cleanRoute.startsWith('/')) cleanRoute = '/' + cleanRoute;
  cleanRoute = cleanRoute.replace(/\/+$/, '');
  const cleanBase = cleanRoute.replace(/\/login$/i, '') || cleanRoute;
  const cleanLogin = cleanRoute.toLowerCase().endsWith('/login') ? cleanRoute : `${cleanBase}/login`;

  return {
    plugins: [
      react(),
      tailwindcss()
    ],
    define: {
      __ADMIN_ROUTE__: JSON.stringify(cleanBase),
      __ADMIN_LOGIN_ROUTE__: JSON.stringify(cleanLogin)
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          secure: false
        },
        '/uploads': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          secure: false
        },
        '/images/uploads': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          secure: false
        },
        '/socket.io': {
          target: 'http://localhost:5000',
          ws: true,
          changeOrigin: true
        }
      }
    }
  };
});
