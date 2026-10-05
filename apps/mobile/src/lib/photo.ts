import { LIMITES } from '@billets-doux/shared'
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'
import * as ImagePicker from 'expo-image-picker'

export type SourcePhoto = 'galerie' | 'appareil'

export class PermissionRefusee extends Error {}

/**
 * Choisit une photo, la ramène à 1 600 px de large au plus et la ré-encode en JPEG.
 * Le ré-encodage repart des pixels : les métadonnées (dont la position GPS) ne suivent pas.
 */
export async function choisirPhoto(source: SourcePhoto) {
  if (source === 'appareil') {
    const permission = await ImagePicker.requestCameraPermissionsAsync()
    if (!permission.granted) throw new PermissionRefusee('appareil photo')
  }
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    quality: 1,
    exif: false,
  }
  const resultat =
    source === 'appareil'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options)
  const choisie = resultat.canceled ? null : resultat.assets[0]
  if (!choisie) return null

  const contexte = ImageManipulator.manipulate(choisie.uri)
  if (choisie.width > LIMITES.photoLargeur) contexte.resize({ width: LIMITES.photoLargeur })
  const image = await contexte.renderAsync()
  const enregistree = await image.saveAsync({ compress: 0.8, format: SaveFormat.JPEG })
  return { uri: enregistree.uri, largeur: enregistree.width, hauteur: enregistree.height }
}
