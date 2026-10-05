import { StyleSheet, View } from 'react-native'

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
}

/** Composant Figma « Case du calendrier ». */
export function Case({ etat, jourSemaine, jour, info, libelleAccessible }: Props) {
  const aujourdhui = etat === 'aujourdhui'
  const vide = etat === 'vide'
  const couleurDate = aujourdhui
    ? couleurs.texte.surCachet
    : vide
      ? couleurs.texte.encreDouce
      : couleurs.texte.encre

  return (
    <View accessible accessibilityLabel={libelleAccessible} style={[styles.case, styles[etat]]}>
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
          <Vocal
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
