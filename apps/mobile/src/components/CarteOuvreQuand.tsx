import type { FC } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import type { SvgProps } from 'react-native-svg'

import Cadenas from '@/assets/icons/Cadenas.svg'
import Coeur from '@/assets/icons/Coeur.svg'
import Joker from '@/assets/icons/Joker.svg'
import Lune from '@/assets/icons/Lune.svg'
import Suivant from '@/assets/icons/Suivant.svg'
import Surprise from '@/assets/icons/Surprise.svg'
import { couleurs, rayons } from '@/theme/tokens'

import { BoutonRond } from './BoutonRond'
import { Texte } from './Texte'

/** Icônes des lettres, en rotation (comme dans la maquette 3.6). */
const ICONES: FC<SvgProps>[] = [Lune, Coeur, Surprise, Joker]
export const iconeLettre = (rang: number) => ICONES[rang % ICONES.length] ?? Lune

/** Une lettre « Ouvre quand… » (3.6 côté auteur, liste des lettres reçues côté destinataire). */
export function CarteOuvreQuand({
  titre,
  details,
  ouverte,
  Icone,
  onPress,
}: {
  titre: string
  /** « poème · prête », « photo · ouverte le 12 octobre ». */
  details: string
  ouverte: boolean
  Icone: FC<SvgProps>
  onPress?: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`Ouvre quand ${titre}. ${details}.`}
      style={({ pressed }) => [styles.carte, ouverte && styles.ouverte, pressed && styles.presse]}
    >
      {ouverte ? (
        <View style={styles.rondOuvert}>
          <Icone width={20} height={20} color={couleurs.texte.encre} />
        </View>
      ) : (
        <BoutonRond Icone={Icone} fond={couleurs.decor.lavande} />
      )}
      <View style={styles.texte}>
        <Texte variante="labelS" couleur={couleurs.texte.encreDouce}>
          Ouvre quand
        </Texte>
        <Texte variante="manuscritM">{titre}</Texte>
        <Texte variante="corpsS" couleur={couleurs.texte.encreDouce}>
          {details}
        </Texte>
      </View>
      {ouverte ? (
        <Suivant width={20} height={20} color={couleurs.texte.encreDouce} />
      ) : (
        <Cadenas width={20} height={20} color={couleurs.texte.encre} />
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  // Validé à l'étape 4 : pas de texte sur une couleur de décor, la lavande reste dans la pastille.
  carte: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: rayons.carte,
    borderWidth: 1,
    borderColor: couleurs.trait.ligne,
    backgroundColor: couleurs.fond.carte,
  },
  ouverte: {
    backgroundColor: couleurs.fond.papierOmbre,
  },
  presse: {
    opacity: 0.8,
  },
  rondOuvert: {
    width: 44,
    height: 44,
    borderRadius: rayons.pilule,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: couleurs.trait.ligne,
    backgroundColor: couleurs.fond.carte,
  },
  texte: {
    flex: 1,
    gap: 2,
  },
})
