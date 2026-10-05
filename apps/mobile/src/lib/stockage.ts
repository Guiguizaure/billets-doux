import * as SecureStore from 'expo-secure-store'

const CLE = 'billets-doux.jeton'

/** Jeton de session, chiffré par le système (Keystore Android). */
export const stockageJeton = {
  lire: () => SecureStore.getItemAsync(CLE),
  ecrire: (jeton: string) => SecureStore.setItemAsync(CLE, jeton),
  effacer: () => SecureStore.deleteItemAsync(CLE),
}
