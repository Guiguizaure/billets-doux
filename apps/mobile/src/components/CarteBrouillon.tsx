import { formaterDuree, quandNote, type VueMotAuteur } from '@billets-doux/shared'
import { Pressable, StyleSheet, View } from 'react-native'

import { TYPES_DE_MOT } from '@/lib/typesDeMot'
import { couleurs, rayons } from '@/theme/tokens'

import { BoutonRond } from './BoutonRond'
import { Texte } from './Texte'

/** Carte de la réserve (Figma 3.2) : type, titre, extrait manuscrit, durée ou type et date. */
export function CarteBrouillon({ mot, onPress }: { mot: VueMotAuteur; onPress: () => void }) {
  const { libelle, Icone, fond } = TYPES_DE_MOT[mot.type]
  const extrait = mot.texte?.trim().split('\n')[0] ?? ''
  const titre = mot.titre || (extrait ? premiersMots(extrait) : libelle)
  const detail = mot.vocal?.duree ? formaterDuree(mot.vocal.duree) : libelle.toLowerCase()
  const meta = `${detail} · ${quandNote(mot.modifieLe)}`

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${libelle} : ${titre}. ${extrait ? `${extrait}. ` : ''}${meta}`}
      accessibilityHint="Ouvre le brouillon"
      style={({ pressed }) => [styles.carte, pressed && styles.presse]}
    >
      <BoutonRond Icone={Icone} fond={fond} />
      <View style={styles.texte}>
        <Texte variante="labelM" numberOfLines={1}>
          {titre}
        </Texte>
        {extrait ? (
          <Texte variante="manuscritM" numberOfLines={2}>
            « {extrait} »
          </Texte>
        ) : null}
        <Texte variante="labelS" couleur={couleurs.texte.encreDouce}>
          {meta}
        </Texte>
      </View>
    </Pressable>
  )
}

function premiersMots(texte: string) {
  const mots = texte.split(/\s+/).slice(0, 5).join(' ')
  return mots.length < texte.length ? `${mots}…` : mots
}

const styles = StyleSheet.create({
  carte: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: rayons.carte,
    borderWidth: 1,
    borderColor: couleurs.trait.ligne,
    backgroundColor: couleurs.fond.carte,
  },
  presse: {
    opacity: 0.8,
  },
  texte: {
    flex: 1,
    gap: 2,
  },
})
