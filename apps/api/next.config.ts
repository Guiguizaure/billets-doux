import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

const nextConfig: NextConfig = {
  // Le paquet partagé est publié en TypeScript source.
  transpilePackages: ['@billets-doux/shared'],
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
