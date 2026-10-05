import { defineConfig } from 'vitest/config'

// Tests de la logique pure de l'appli (sans React Native ni Expo).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
