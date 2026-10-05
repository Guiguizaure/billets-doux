import { Alert } from 'react-native'

/** Demande une confirmation (natif : boîte de dialogue du système). */
export function confirmer(titre: string, message: string, action: string) {
  return new Promise<boolean>((resoudre) => {
    Alert.alert(titre, message, [
      { text: 'Annuler', style: 'cancel', onPress: () => resoudre(false) },
      { text: action, style: 'destructive', onPress: () => resoudre(true) },
    ])
  })
}

/** Choix de la source d'une photo ; null si la personne annule. */
export function choisirSourcePhoto() {
  return new Promise<'galerie' | 'appareil' | null>((resoudre) => {
    Alert.alert('Ajouter une photo', undefined, [
      { text: 'Prendre une photo', onPress: () => resoudre('appareil') },
      { text: 'Choisir dans la galerie', onPress: () => resoudre('galerie') },
      { text: 'Annuler', style: 'cancel', onPress: () => resoudre(null) },
    ])
  })
}
