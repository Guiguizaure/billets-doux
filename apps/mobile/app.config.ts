import type { ConfigContext, ExpoConfig } from 'expo/config'

/**
 * Complète app.json. `google-services.json` (Firebase, pour les notifications Android) n'est
 * jamais versionné : en build EAS, il arrive par la variable fichier GOOGLE_SERVICES_JSON ;
 * en local, il est lu dans ce dossier.
 */
export default ({ config }: ConfigContext): ExpoConfig =>
  ({
    ...config,
    android: {
      ...config.android,
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
    },
  }) as ExpoConfig
