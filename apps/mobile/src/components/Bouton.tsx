import type { FC, Ref } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native'
import type { SvgProps } from 'react-native-svg'

import { couleurs, rayons } from '@/theme/tokens'

import { Texte } from './Texte'

type Props = {
  libelle: string
  onPress?: () => void
  variante?: 'principal' | 'secondaire' | 'discret'
  Icone?: FC<SvgProps>
  desactive?: boolean
  /** Action en cours : le bouton est désactivé et affiche une roue. */
  enCours?: boolean
  pleineLargeur?: boolean
  accessibilityHint?: string
  /** Pour donner le focus au bouton (ex. : « Annuler » à l'ouverture d'un dialogue). */
  ref?: Ref<View>
}

/** Composant Figma « Bouton » (Principal, Secondaire, Discret). */
export function Bouton({
  libelle,
  onPress,
  variante = 'principal',
  Icone,
  desactive,
  enCours,
  pleineLargeur,
  accessibilityHint,
  ref,
}: Props) {
  const couleurTexte = variante === 'principal' ? couleurs.texte.surCachet : couleurs.texte.encre
  const inactif = desactive || enCours
  return (
    <Pressable
      ref={ref}
      accessibilityRole="button"
      accessibilityLabel={libelle}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactif, busy: enCours }}
      disabled={inactif}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        styles[variante],
        pleineLargeur && styles.pleineLargeur,
        (pressed || inactif) && styles.presse,
      ]}
    >
      <View style={styles.contenu}>
        {enCours ? (
          <ActivityIndicator size="small" color={couleurTexte} />
        ) : Icone ? (
          <Icone width={20} height={20} color={couleurTexte} />
        ) : null}
        <Texte variante="labelM" couleur={couleurTexte} style={styles.libelle}>
          {libelle}
        </Texte>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    borderRadius: rayons.pilule,
    paddingHorizontal: 24,
    paddingVertical: 15,
  },
  principal: {
    backgroundColor: couleurs.action.cachet,
  },
  secondaire: {
    backgroundColor: couleurs.fond.carte,
    borderWidth: 1.5,
    borderColor: couleurs.texte.encre,
  },
  discret: {},
  pleineLargeur: {
    alignSelf: 'stretch',
  },
  presse: {
    opacity: 0.7,
  },
  contenu: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  // Texte agrandi par le système : le libellé passe à la ligne au lieu d'être coupé.
  libelle: {
    flexShrink: 1,
    textAlign: 'center',
  },
})
