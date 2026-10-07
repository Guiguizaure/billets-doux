/**
 * Variables sans lesquelles l'API de production ne peut pas tourner (voir .env.example et
 * DEPLOIEMENT.md). `S3_REGION` (« auto ») et `APP_SCHEME` (« billetsdoux ») ont une valeur par
 * défaut.
 */
export const VARIABLES_REQUISES = [
  'DATABASE_URI',
  'PAYLOAD_SECRET',
  'SERVER_URL',
  'PUBLIC_URL',
  'WEB_URL',
  'CORS_ORIGINS',
  'S3_ENDPOINT',
  'S3_PUBLIC_ENDPOINT',
  'S3_BUCKET',
  'S3_ACCESS_KEY_ID',
  'S3_SECRET_ACCESS_KEY',
  'DEMO_MOT_DE_PASSE',
  'EXPO_ACCESS_TOKEN',
] as const

export const variablesManquantes = (env: NodeJS.ProcessEnv = process.env) =>
  VARIABLES_REQUISES.filter((nom) => !env[nom]?.trim())

/**
 * En production, le serveur ne démarre pas à moitié configuré (sans stockage, des mots
 * s'écriraient sans leurs photos ; sans jeton Expo, les notifications partiraient en échec).
 * `next build` n'est pas concerné : sur Heroku, les variables existent au démarrage.
 */
export function exigerVariablesDeProduction(env: NodeJS.ProcessEnv = process.env) {
  if (env.NODE_ENV !== 'production') return
  if (env.NEXT_PHASE === 'phase-production-build') return
  const manquantes = variablesManquantes(env)
  if (manquantes.length > 0) {
    throw new Error(
      `Variables d'environnement manquantes en production : ${manquantes.join(', ')}. ` +
        'Renseigne-les dans les Config Vars Heroku (voir .env.example et DEPLOIEMENT.md). ' +
        'Le serveur ne démarre pas.',
    )
  }
}
