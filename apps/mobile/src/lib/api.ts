import Constants from 'expo-constants'
import { Platform } from 'react-native'

const PORT_API = 3100

/**
 * URL de l'API. En développement, on la déduit de l'adresse qui sert l'appli :
 * - natif : l'hôte du serveur Metro (l'IP du Mac sur le réseau local) ;
 * - web : l'hôte de la page, pour que la version web marche aussi depuis un autre appareil.
 */
export function apiUrl() {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:${PORT_API}`
  }
  const hote = Constants.expoConfig?.hostUri?.split(':')[0] ?? 'localhost'
  return `http://${hote}:${PORT_API}`
}
