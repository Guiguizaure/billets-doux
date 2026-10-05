import path from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vitest/config'

const dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(dirname, 'src') },
  },
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    include: ['tests/int/**/*.int.spec.ts'],
    hookTimeout: 30_000,
    // Tests d'intégration (hachage des mots de passe, transactions Mongo, stockage) :
    // 5 s par défaut ne suffisent pas quand la machine est chargée.
    testTimeout: 20_000,
    // Les fichiers partagent la même base de test : on les exécute l'un après l'autre.
    fileParallelism: false,
  },
})
