import { Pressable, StyleSheet } from 'react-native'

import { couleurs, rayons } from '@/theme/tokens'

import { Texte } from './Texte'

type Props = {
  libelle: string
  active: boolean
  onPress: () => void
}

/** Composant Figma « Puce (choix) ». */
export function Puce({ libelle, active, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: active }}
      accessibilityLabel={libelle}
      onPress={onPress}
      style={[styles.base, active ? styles.active : styles.inactive]}
    >
      <Texte variante="labelM" couleur={active ? couleurs.fond.carte : couleurs.texte.encre}>
        {libelle}
      </Texte>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    borderRadius: rayons.pilule,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  active: {
    backgroundColor: couleurs.texte.encre,
  },
  inactive: {
    backgroundColor: couleurs.fond.carte,
    borderWidth: 1.5,
    borderColor: couleurs.trait.ligne,
  },
})
