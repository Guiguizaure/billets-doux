import type { MetadataRoute } from 'next'

/** L'API et son admin ne s'indexent pas (la version web publique est sur billetsdoux.app). */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', disallow: '/' } }
}
