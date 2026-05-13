import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: [
      'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'src/e2e/bot.spec.ts',
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
    ],
  },
})
