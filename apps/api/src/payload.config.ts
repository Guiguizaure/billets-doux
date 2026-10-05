import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { fr } from '@payloadcms/translations/languages/fr'
import path from 'path'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { Admins } from './collections/Admins'
import { Users } from './collections/Users'
import { health } from './endpoints/health'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const corsOrigins = (process.env.CORS_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

export default buildConfig({
  serverURL: process.env.SERVER_URL,
  admin: {
    user: Admins.slug,
    meta: { titleSuffix: ' · Billets doux' },
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  i18n: {
    supportedLanguages: { fr },
    fallbackLanguage: 'fr',
  },
  collections: [Admins, Users],
  endpoints: [health],
  cors: corsOrigins,
  csrf: corsOrigins,
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    // Les types générés vivent dans le paquet partagé, pour l'appli comme pour l'API.
    outputFile: path.resolve(dirname, '../../../packages/shared/src/payload-types.ts'),
    declare: false,
  },
  db: mongooseAdapter({
    url: process.env.DATABASE_URI || '',
  }),
  sharp,
  graphQL: { disable: true },
})
