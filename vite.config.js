import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // GitHub Actions sets GITHUB_ACTIONS=true; use the repo name as the base
  // path so asset URLs resolve correctly on GitHub Pages.
  // Local dev stays at '/' so http://localhost:5173 works unchanged.
  base: process.env.GITHUB_ACTIONS ? '/323PitchingPerformance/' : '/',
  server: {
    port: 5173,
    open: true,
  },
})
