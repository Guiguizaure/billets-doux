import Constants from 'expo-constants'

const PORT_API = 3100

/**
 * URL de l'API. En développement, on reprend l'adresse du serveur Metro
 * (l'IP du Mac sur le réseau local), pour que le téléphone joigne l'API sans réglage.
 */
export function apiUrl() {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL
  const hote = Constants.expoConfig?.hostUri?.split(':')[0] ?? 'localhost'
  return `http://${hote}:${PORT_API}`
}
