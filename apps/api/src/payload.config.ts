import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { fr } from '@payloadcms/translations/languages/fr'
import path from 'path'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { Admins } from './collections/Admins'
import { Duos } from './collections/Duos'
import { EnvoisPush } from './collections/EnvoisPush'
import { Medias } from './collections/Medias'
import { Mots } from './collections/Mots'
import { Reponses } from './collections/Reponses'
import { Users } from './collections/Users'
import { comptesEndpoints } from './endpoints/comptes'
import { health } from './endpoints/health'
import { souvenirsEndpoints } from './endpoints/souvenirs'
import { creerDemo } from './services/demo'
import { releverRecus } from './services/notifications'
import { notifierMotsOuvrables, rappelerAuteurs } from './services/taches'
import { lireOrigines } from './lib/origines'
import { supprimerExportsAnciens } from './services/duree'
import { sauvegarder } from './services/sauvegarde'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

// Origines exactes et préversions Cloudflare Pages (`https://*.billets-doux.pages.dev`).
// Payload garde cette liste telle quelle (vérifié dans origines.int.spec.ts).
const origines = lireOrigines(process.env.CORS_ORIGINS)

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
  collections: [Admins, Users, Duos, Mots, Medias, Reponses, EnvoisPush],
  endpoints: [health, ...comptesEndpoints, ...souvenirsEndpoints],
  cors: origines.cors,
  csrf: origines.csrf,

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
  /**
   * Tâches planifiées, exécutées par le serveur de l'API lui-même (file « minute »).
   * Toutes les minutes : un rituel de 8 h doit sonner à 8 h, pas à 8 h 04.
   * Coupées pendant les tests (appelés directement) et avec TACHES_DESACTIVEES=1.
   */
  jobs: {
    tasks: [
      {
        slug: 'motsOuvrables',
        schedule: [{ cron: '* * * * *', queue: 'minute' }],
        handler: async ({ req }) => ({
          output: { annonces: await notifierMotsOuvrables(req.payload) },
        }),
      },
      {
        slug: 'rappelDoux',
        schedule: [{ cron: '*/15 * * * *', queue: 'minute' }],
        handler: async ({ req }) => ({ output: { rappeles: await rappelerAuteurs(req.payload) } }),
      },
      {
        // Le duo de démo revient à l'identique chaque nuit (4 h à Paris l'hiver, 5 h l'été).
        slug: 'demoRemiseAZero',
        schedule: [{ cron: '0 3 * * *', queue: 'minute' }],
        handler: async ({ req }) => {
          if (!process.env.DEMO_MOT_DE_PASSE) return { output: { mots: 0 } }
          return { output: { mots: (await creerDemo(req.payload)).mots } }
        },
      },
      {
        // Sauvegarde de la base vers le dossier privé du bucket, 14 gardées (Atlas gratuit
        // n'en fait pas). Après la remise à zéro de la démo.
        slug: 'sauvegardeNocturne',
        schedule: [{ cron: '30 3 * * *', queue: 'minute' }],
        handler: async ({ req }) => {
          const { nom, supprimees } = await sauvegarder(req.payload)
          return { output: { nom, supprimees: supprimees.length } }
        },
      },
      {
        // Les archives d'export ne restent que 24 heures (politique de confidentialité).
        slug: 'exportsExpires',
        schedule: [{ cron: '45 3 * * *', queue: 'minute' }],
        handler: async () => ({ output: { supprimes: await supprimerExportsAnciens() } }),
      },
      {
        slug: 'recusPush',
        schedule: [{ cron: '*/15 * * * *', queue: 'minute' }],
        handler: async ({ req }) => ({ output: { releves: await releverRecus(req.payload) } }),
      },
    ],
    autoRun: [{ cron: '* * * * *', queue: 'minute' }],
    shouldAutoRun: () => process.env.NODE_ENV !== 'test' && process.env.TACHES_DESACTIVEES !== '1',
  },
})
