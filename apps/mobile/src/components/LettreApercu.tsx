import type { VueMedia } from '@billets-doux/shared'
import { StyleSheet, View } from 'react-native'

import BordureParAvion from '@/assets/illustrations/bordure-par-avion.svg'
import { couleurs, rayons, typo } from '@/theme/tokens'

import { LecteurVocal } from './LecteurVocal'
import { PhotoMedia } from './PhotoMedia'
import { Texte } from './Texte'

type Props = {
  destinataire: string
  type: 'mot' | 'poeme' | 'photo' | 'vocal'
  texte: string | null
  manuscrit: boolean
  photo: VueMedia | null
  vocal: VueMedia | null
  indice: string | null
}

/** Aperçu de la lettre telle qu'elle s'ouvrira (lecture seule). L'ouverture animée : étape 5. */
export function LettreApercu({
  destinataire,
  type,
  texte,
  manuscrit,
  photo,
  vocal,
  indice,
}: Props) {
  return (
    <View style={styles.bloc}>
      {indice ? (
        <Texte variante="corpsS" couleur={couleurs.texte.encreDouce}>
          Avant l’ouverture, {destinataire} verra l’indice : « {indice} »
        </Texte>
      ) : null}
      <View style={styles.lettre}>
        <BordureParAvion width="100%" height={8.5} preserveAspectRatio="none" />
        <View style={styles.feuille}>
          <Texte variante="labelS" couleur={couleurs.texte.encreDouce}>
            POUR {destinataire.toUpperCase()}
          </Texte>
          {photo ? <PhotoMedia mediaId={photo.id} description="Photo du mot" /> : null}
          {texte?.trim() ? (
            <Texte
              variante={manuscrit ? 'manuscritL' : 'corpsM'}
              style={type === 'poeme' ? styles.poeme : null}
            >
              {texte}
            </Texte>
          ) : null}
          {vocal ? <LecteurVocal mediaId={vocal.id} duree={vocal.duree ?? 0} /> : null}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  bloc: {
    gap: 12,
  },
  lettre: {
    overflow: 'hidden',
    borderRadius: rayons.carte,
    borderWidth: 1,
    borderColor: couleurs.trait.ligne,
    backgroundColor: couleurs.fond.carte,
  },
  feuille: {
    gap: 14,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 22,
  },
  poeme: {
    textAlign: 'center',
    lineHeight: typo.manuscritL.lineHeight + 4,
  },
})
