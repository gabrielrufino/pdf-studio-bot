import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: [
      'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'e2e/bot.spec.ts',
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'e2e/landing.spec.ts',
    ],
  },
})
