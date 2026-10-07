import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

/** En-têtes de toutes les réponses : l'API et son admin ne sont jamais indexés. */
const ENTETES = [
  { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
]

const nextConfig: NextConfig = {
  // Le paquet partagé est publié en TypeScript source.
  transpilePackages: ['@billets-doux/shared'],
  /**
   * Heroku : un serveur autonome qui n'embarque que les dépendances de l'API (le dépôt entier,
   * Expo compris, dépasserait la limite de 500 Mo). Racine du monorepo pour suivre
   * packages/shared. Voir scripts/preparer-standalone.mjs et le Procfile.
   */
  output: 'standalone',
  outputFileTracingRoot: path.resolve(dirname, '../..'),
  headers: async () => [{ source: '/:chemin*', headers: ENTETES }],
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  turbopack: {
    // Racine du monorepo, pour résoudre packages/shared.
    root: path.resolve(dirname, '../..'),
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
