import type { MotOuvert } from '@billets-doux/shared'
import { StyleSheet, View } from 'react-native'

import { couleurs } from '@/theme/tokens'

import { LecteurVocal } from './LecteurVocal'
import { PhotoMedia } from './PhotoMedia'
import { Texte } from './Texte'

/** Une photo ouverte (Figma 2.6) : polaroïd légèrement penché, le texte du mot en légende. */
export function Polaroid({ mot, meta }: { mot: MotOuvert; meta: string }) {
  return (
    <View style={styles.bloc}>
      <View style={styles.cadre}>
        {mot.photo ? (
          <PhotoMedia mediaId={mot.photo.id} description="Photo du mot" forme="carre" />
        ) : null}
        {mot.texte?.trim() ? (
          <Texte variante="manuscritM" style={styles.legende}>
            {mot.texte}
          </Texte>
        ) : null}
      </View>
      {mot.vocal ? (
        <View style={styles.vocal}>
          <LecteurVocal mediaId={mot.vocal.id} duree={mot.vocal.duree ?? 0} />
        </View>
      ) : null}
      <Texte variante="labelS" couleur={couleurs.texte.encreDouce} style={styles.centre}>
        {meta}
      </Texte>
    </View>
  )
}

const styles = StyleSheet.create({
  bloc: {
    gap: 20,
    paddingTop: 6,
  },
  cadre: {
    gap: 12,
    marginHorizontal: 10,
    padding: 15,
    paddingBottom: 20,
    backgroundColor: couleurs.fond.carte,
    borderWidth: 1,
    borderColor: couleurs.trait.ligne,
    borderRadius: 4,
    transform: [{ rotate: '-2deg' }],
    boxShadow: '0px 10px 24px -8px rgba(42, 35, 70, 0.25)',
  },
  legende: {
    textAlign: 'center',
  },
  vocal: {
    paddingHorizontal: 10,
  },
  centre: {
    textAlign: 'center',
  },
})
