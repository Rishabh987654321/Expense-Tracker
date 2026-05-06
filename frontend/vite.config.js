import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from "path"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true,
    port: 5173,
    // Allow any *.localhost hostname (Vite blocks unknown hosts by default
    // when host is set). The pattern matches arbitrary subdomains like
    // acme.localhost, globex.localhost, app.localhost.
    allowedHosts: ['localhost', '.localhost'],
  },
})
