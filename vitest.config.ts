import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globalSetup: ['./test/setup.ts'],
    exclude: [
      'node_modules/**',
      '.stryker-tmp/**',
    ],
  },
})
