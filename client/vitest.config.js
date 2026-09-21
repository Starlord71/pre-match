import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Vitest config kept separate from vite.config.js so the app build does not
// carry the test-only jsdom environment.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
  },
})
