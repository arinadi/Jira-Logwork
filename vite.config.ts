import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Relative asset paths: the page is served from chrome-extension://<id>/, not a web root.
  base: './',
  build: {
    // Committed folder that users load with "Load unpacked"; public/ supplies manifest.json and background.js.
    outDir: 'extension',
    emptyOutDir: true,
  },
})
