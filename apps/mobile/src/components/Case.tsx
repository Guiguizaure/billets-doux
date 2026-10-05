import type { FC } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import type { SvgProps } from 'react-native-svg'

import Plus from '@/assets/icons/Plus.svg'
import Vocal from '@/assets/icons/Vocal.svg'
import { couleurs, ombres, rayons } from '@/theme/tokens'

import { Texte } from './Texte'

export type EtatCase = 'ouverte' | 'aujourdhui' | 'verrouillee' | 'vide' | 'prete'

type Props = {
  etat: EtatCase
  jourSemaine: string
  jour: string
  info: string
  /** Phrase complète lue par le lecteur d'écran, ex. « Lundi 12, verrouillée, dans 3 jours ». */
  libelleAccessible: string
  /** Icône de la pastille (type du mot) ; une case vide affiche « + ». */
  Icone?: FC<SvgProps>
  onPress?: () => void
}

/** Composant Figma « Case du calendrier ». */
export function Case({
  etat,
  jourSemaine,
  jour,
  info,
  libelleAccessible,
  Icone = Vocal,
  onPress,
}: Props) {
  const aujourdhui = etat === 'aujourdhui'
  const vide = etat === 'vide'
  const couleurDate = aujourdhui
    ? couleurs.texte.surCachet
    : vide
      ? couleurs.texte.encreDouce
      : couleurs.texte.encre

  const IconePastille = vide ? Plus : Icone
  const contenu = (
    <>
      <View style={styles.date}>
        <Texte
          variante="labelS"
          couleur={aujourdhui ? couleurs.texte.surCachet : couleurs.texte.encreDouce}
        >
          {jourSemaine}
        </Texte>
        <Texte variante="chiffreCase" couleur={couleurDate}>
          {jour}
        </Texte>
      </View>
      <View style={styles.indice}>
        <View style={[styles.pastille, pastilles[etat]]}>
          <IconePastille
            width={16}
            height={16}
            color={vide ? couleurs.texte.encreDouce : couleurs.texte.encre}
          />
        </View>
        <Texte
          variante="labelS"
          couleur={aujourdhui ? couleurs.texte.surCachet : couleurs.texte.encreDouce}
        >
          {info}
        </Texte>
      </View>
    </>
  )

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={libelleAccessible}
        style={({ pressed }) => [styles.case, styles[etat], pressed && styles.presse]}
      >
        {contenu}
      </Pressable>
    )
  }
  return (
    <View accessible accessibilityLabel={libelleAccessible} style={[styles.case, styles[etat]]}>
      {contenu}
    </View>
  )
}

const styles = StyleSheet.create({
  case: {
    width: 111,
    height: 128,
    padding: 12,
    borderRadius: rayons.case,
    justifyContent: 'space-between',
  },
  ouverte: {
    backgroundColor: couleurs.fond.carte,
    borderWidth: 1,
    borderColor: couleurs.trait.ligne,
  },
  aujourdhui: {
    backgroundColor: couleurs.action.cachet,
    boxShadow: ombres.cachet,
  },
  verrouillee: {
    backgroundColor: couleurs.fond.papierOmbre,
    borderWidth: 1,
    borderColor: couleurs.trait.ligne,
  },
  vide: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: couleurs.trait.ligne,
  },
  prete: {
    backgroundColor: couleurs.fond.carte,
    borderWidth: 1.5,
    borderColor: couleurs.decor.sauge,
  },
  presse: {
    opacity: 0.75,
  },
  date: {
    gap: 2,
  },
  indice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pastille: {
    width: 28,
    height: 28,
    borderRadius: rayons.pilule,
    alignItems: 'center',
    justifyContent: 'center',
  },
})

const pastilles = StyleSheet.create({
  ouverte: { backgroundColor: couleurs.decor.rose },
  aujourdhui: { backgroundColor: couleurs.decor.soleil },
  verrouillee: { backgroundColor: couleurs.fond.carte },
  vide: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: couleurs.trait.ligne },
  prete: { backgroundColor: couleurs.decor.sauge },
})
