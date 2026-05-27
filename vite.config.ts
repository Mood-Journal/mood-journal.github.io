import { defineConfig, type UserConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import type { InlineConfig } from 'vitest/node'

// `test` is asserted on because Vite 8 (rolldown-vite) ships its own UserConfig
// type that Vitest's module augmentation doesn't extend; the key is valid at
// runtime and Vitest reads it.
export default defineConfig({
  base: '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
  },
} as UserConfig & { test: InlineConfig })
