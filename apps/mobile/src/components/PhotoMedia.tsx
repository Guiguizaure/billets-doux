import { ActivityIndicator, Image, StyleSheet, View } from 'react-native'

import { useUrlMedia } from '@/lib/useUrlMedia'
import { couleurs } from '@/theme/tokens'

import { Texte } from './Texte'

/** Photo d'un mot : URL signée de courte durée, ou fichier local pendant l'envoi. */
export function PhotoMedia({
  mediaId = null,
  uriLocale = null,
  description,
  forme = 'paysage',
}: {
  mediaId?: string | null
  uriLocale?: string | null
  description: string
  /** `carre` : la photo d'un polaroïd (2.6). */
  forme?: 'paysage' | 'carre'
}) {
  const { url, erreur } = useUrlMedia(mediaId, uriLocale)
  return (
    <View style={[styles.cadre, forme === 'carre' && styles.carre]}>
      {url ? (
        <Image
          source={{ uri: url }}
          style={styles.image}
          resizeMode="cover"
          accessibilityLabel={description}
        />
      ) : erreur ? (
        <Texte variante="corpsS" couleur={couleurs.texte.encreDouce}>
          Photo indisponible
        </Texte>
      ) : (
        <ActivityIndicator color={couleurs.texte.encre} />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  cadre: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: couleurs.fond.papierOmbre,
    alignItems: 'center',
    justifyContent: 'center',
  },
  carre: {
    aspectRatio: 1,
    borderRadius: 2,
  },
  image: {
    width: '100%',
    height: '100%',
  },
})
