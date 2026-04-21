import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/api/jira': {
        target: 'https://atlassian.net',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/jira/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            const domain = req.headers['x-jira-domain'] as string;
            if (domain) {
              // Update the host and target dynamically
              proxyReq.setHeader('Host', domain);
              // Note: http-proxy doesn't easily allow changing target per-request in 'configure'
              // but we can at least ensure the Host header is correct.
              // For a true multi-tenant proxy, we'd need a more advanced setup.
            }
          });
        }
      }
    }
  }
})
