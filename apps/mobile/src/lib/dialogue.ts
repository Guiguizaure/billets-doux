import { Alert } from 'react-native'

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
