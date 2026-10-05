import { Pressable, StyleSheet } from 'react-native'

import { couleurs } from '@/theme/tokens'

import { Texte } from './Texte'

/** Petit lien souligné, pour les actions secondaires hors du Figma. */
export function LienTexte({ libelle, onPress }: { libelle: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      hitSlop={10}
      style={({ pressed }) => [styles.lien, pressed && styles.presse]}
    >
      <Texte variante="corpsS" couleur={couleurs.texte.encre} style={styles.souligne}>
        {libelle}
      </Texte>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  lien: {
    alignSelf: 'center',
    paddingVertical: 4,
  },
  souligne: {
    textDecorationLine: 'underline',
  },
  presse: {
    opacity: 0.6,
  },
})
