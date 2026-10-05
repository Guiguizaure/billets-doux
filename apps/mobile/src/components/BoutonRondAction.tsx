import type { FC } from 'react'
import { Pressable, type PressableProps, StyleSheet, View } from 'react-native'
import type { SvgProps } from 'react-native-svg'

import { couleurs, rayons } from '@/theme/tokens'

import { Texte } from './Texte'

type Props = Pick<PressableProps, 'onPress' | 'onLongPress' | 'onPressOut' | 'delayLongPress'> & {
  Icone?: FC<SvgProps>
  libelle: string
  /** Texte affiché sous le bouton (Label S, encre douce). */
  legende?: string
  taille?: 40 | 48 | 64 | 80
  tailleIcone?: number
  variante?: 'papier' | 'carte' | 'cachet'
  desactive?: boolean
  accessibilityHint?: string
  children?: React.ReactNode
}

/** Boutons ronds d'action du Figma (outils de 3.4, capture rapide de 3.2, commandes de 3.3). */
export function BoutonRondAction({
  Icone,
  libelle,
  legende,
  taille = 48,
  tailleIcone = 20,
  variante = 'papier',
  desactive,
  children,
  accessibilityHint,
  ...appuis
}: Props) {
  const couleurIcone = variante === 'cachet' ? couleurs.texte.surCachet : couleurs.texte.encre
  return (
    <View style={styles.colonne}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={libelle}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: desactive }}
        disabled={desactive}
        hitSlop={6}
        style={({ pressed }) => [
          styles.rond,
          styles[variante],
          { width: taille, height: taille },
          variante === 'cachet' && taille >= 64 && styles.ombre,
          (pressed || desactive) && styles.presse,
        ]}
        {...appuis}
      >
        {children ??
          (Icone ? <Icone width={tailleIcone} height={tailleIcone} color={couleurIcone} /> : null)}
      </Pressable>
      {legende ? (
        <Texte variante="labelS" couleur={couleurs.texte.encreDouce} style={styles.legende}>
          {legende}
        </Texte>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  colonne: {
    alignItems: 'center',
    gap: 6,
  },
  rond: {
    borderRadius: rayons.pilule,
    alignItems: 'center',
    justifyContent: 'center',
  },
  papier: {
    backgroundColor: couleurs.fond.papier,
  },
  carte: {
    backgroundColor: couleurs.fond.carte,
    borderWidth: 1,
    borderColor: couleurs.trait.ligne,
  },
  cachet: {
    backgroundColor: couleurs.action.cachet,
  },
  ombre: {
    boxShadow: '0px 8px 20px -4px rgba(199, 69, 43, 0.35)',
  },
  presse: {
    opacity: 0.7,
  },
  legende: {
    textAlign: 'center',
    maxWidth: 110,
  },
})
