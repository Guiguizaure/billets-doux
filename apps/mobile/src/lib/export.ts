import { Linking } from 'react-native'

import { api } from './client'

/**
 * Fabrique l'archive des souvenirs (côté API) et l'ouvre dans le navigateur, qui la
 * télécharge : pas de module natif en plus. Renvoie le nombre de mots exportés.
 */
export async function exporterSouvenirs() {
  const { url, mots } = await api.exporter()
  await Linking.openURL(url)
  return mots
}
