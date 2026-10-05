import * as Clipboard from 'expo-clipboard'
import { Share } from 'react-native'

/** Résultat commun aux versions native et web (lib/partage.web.ts). */
export type ResultatPartage = 'partage' | 'annule' | 'copie' | 'impossible'

/** Ouvre la feuille de partage du système. */
export async function partager({
  message,
}: {
  message: string
  lien: string
}): Promise<ResultatPartage> {
  const { action } = await Share.share({ message })
  return action === Share.dismissedAction ? 'annule' : 'partage'
}

/** Copie un texte ; renvoie faux si le presse-papiers est indisponible. */
export async function copier(texte: string) {
  try {
    await Clipboard.setStringAsync(texte)
    return true
  } catch {
    return false
  }
}
