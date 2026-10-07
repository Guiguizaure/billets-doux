import type { ConfigContext, ExpoConfig } from 'expo/config'

/**
 * Deux applis Android qui cohabitent sur un même téléphone :
 * - production (APK `preview`, puis `production`) : com.webjuno.billetsdoux, « Billets doux » ;
 * - développement (`APP_VARIANT=development`, profil EAS `development` et `pnpm start`) :
 *   com.webjuno.billetsdoux.dev, « Billets doux (dev) », avec son propre schéma de lien pour
 *   qu'une invitation n'ouvre pas la mauvaise appli.
 *
 * `google-services.json` (Firebase, pour les notifications) n'est jamais versionné : en build
 * EAS, il arrive par la variable fichier GOOGLE_SERVICES_JSON ; en local, il est lu dans ce
 * dossier. Il contient les deux applis.
 */
const developpement = process.env.APP_VARIANT === 'development'

export default ({ config }: ConfigContext): ExpoConfig =>
  ({
    ...config,
    name: developpement ? 'Billets doux (dev)' : config.name,
    scheme: developpement ? 'billetsdoux-dev' : config.scheme,
    android: {
      ...config.android,
      package: developpement ? 'com.webjuno.billetsdoux.dev' : config.android?.package,
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
    },
  }) as ExpoConfig
