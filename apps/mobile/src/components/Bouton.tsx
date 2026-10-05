import type { FC } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import type { SvgProps } from 'react-native-svg'

import { couleurs, rayons } from '@/theme/tokens'

import { Texte } from './Texte'

type Props = {
  libelle: string
  onPress?: () => void
  variante?: 'principal' | 'secondaire' | 'discret'
  Icone?: FC<SvgProps>
  desactive?: boolean
}

/** Composant Figma « Bouton » (Principal, Secondaire, Discret). */
export function Bouton({ libelle, onPress, variante = 'principal', Icone, desactive }: Props) {
  const couleurTexte = variante === 'principal' ? couleurs.texte.surCachet : couleurs.texte.encre
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={libelle}
      accessibilityState={{ disabled: desactive }}
      disabled={desactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        styles[variante],
        (pressed || desactive) && styles.presse,
      ]}
    >
      <View style={styles.contenu}>
        {Icone ? <Icone width={20} height={20} color={couleurTexte} /> : null}
        <Texte variante="labelM" couleur={couleurTexte}>
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
  presse: {
    opacity: 0.7,
  },
  contenu: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
})
