import { ActivityIndicator, Image, StyleSheet, View } from 'react-native'

import { useUrlMedia } from '@/lib/useUrlMedia'
import { couleurs } from '@/theme/tokens'

import { Texte } from './Texte'

/** Photo d'un mot : URL signée de courte durée, ou fichier local pendant l'envoi. */
export function PhotoMedia({
  mediaId = null,
  uriLocale = null,
  description,
}: {
  mediaId?: string | null
  uriLocale?: string | null
  description: string
}) {
  const { url, erreur } = useUrlMedia(mediaId, uriLocale)
  return (
    <View style={styles.cadre}>
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
  image: {
    width: '100%',
    height: '100%',
  },
})
