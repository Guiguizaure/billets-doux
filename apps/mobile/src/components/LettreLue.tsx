import type { MotOuvert } from '@billets-doux/shared'
import { StyleSheet, View } from 'react-native'

import BordureParAvion from '@/assets/illustrations/bordure-par-avion.svg'
import TimbreLune from '@/assets/illustrations/timbre-lune.svg'
import { couleurs, rayons, typo } from '@/theme/tokens'

import { LecteurVocal } from './LecteurVocal'
import { PhotoMedia } from './PhotoMedia'
import { Texte } from './Texte'

/**
 * Un mot ou un poème ouvert (Figma 2.4) : bordure « par avion », timbre, écriture
 * manuscrite et signature. Une photo ou un vocal joints s'y glissent.
 */
export function LettreLue({ mot, meta, date }: { mot: MotOuvert; meta: string; date: string }) {
  return (
    <View style={styles.lettre}>
      <BordureParAvion width="100%" height={8.5} preserveAspectRatio="none" />
      <View style={styles.feuille}>
        <View style={styles.enTete}>
          <View style={styles.meta}>
            <Texte variante="labelS" couleur={couleurs.texte.encreDouce}>
              {meta}
            </Texte>
            <Texte variante="corpsS" couleur={couleurs.texte.encreDouce}>
              {date}
            </Texte>
          </View>
          <TimbreLune width={43.2} height={52.8} />
        </View>
        {mot.photo ? <PhotoMedia mediaId={mot.photo.id} description="Photo du mot" /> : null}
        {mot.texte?.trim() ? (
          <Texte
            variante={mot.manuscrit ? 'manuscritL' : 'corpsM'}
            style={mot.type === 'poeme' && mot.manuscrit ? styles.poeme : null}
          >
            {mot.texte}
          </Texte>
        ) : null}
        {mot.vocal ? <LecteurVocal mediaId={mot.vocal.id} duree={mot.vocal.duree ?? 0} /> : null}
        {/* Cachet sur carte : 4,7:1, lisible. */}
        <Texte variante="manuscritM" couleur={couleurs.action.cachet} style={styles.signature}>
          — {mot.auteur.prenom}
        </Texte>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
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
    paddingTop: 22,
    paddingBottom: 24,
  },
  enTete: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  meta: {
    flex: 1,
    gap: 4,
  },
  poeme: {
    lineHeight: typo.manuscritL.lineHeight + 4,
  },
  signature: {
    alignSelf: 'flex-end',
  },
})
