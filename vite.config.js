import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: '/',
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query'],
  },
  server: {
    proxy: {
      '/database': {
        target: 'https://adminpage.hypersmmo.workers.dev/admin',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/database/, '/database'),
      },
      '/api/streamers': {
        target: 'https://twitch-api.hypersmmo.workers.dev',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api\/streamers/, '/api/streamers'),
      },
    },
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          query: ['@tanstack/react-query'],
          jszip: ['jszip'],
        },
        // Optimize chunk names for readability and SEO (shorter hash)
        entryFileNames: 'js/[name].[hash:6].js',
        chunkFileNames: 'js/[name].[hash:6].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|gif|svg|webp/i.test(ext)) {
            return `images/[name].[hash:6][extname]`;
          } else if (/woff|woff2|ttf|otf|eot/i.test(ext)) {
            return `fonts/[name].[hash:6][extname]`;
          } else if (ext === 'css') {
            return `css/[name].[hash:6][extname]`;
          }
          return `[name].[hash:6][extname]`;
        },
      },
    },
    assetsInlineLimit: 4096,
    reportCompressedSize: true,
    chunkSizeWarningLimit: 500,
    sourcemap: false,
  },
}))
