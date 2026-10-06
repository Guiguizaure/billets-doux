import { Pressable, StyleSheet } from 'react-native'

import { couleurs } from '@/theme/tokens'

import { Texte } from './Texte'

/** Petit lien souligné, pour les actions secondaires hors du Figma. */
export function LienTexte({
  libelle,
  onPress,
  couleur = couleurs.texte.encre,
}: {
  libelle: string
  onPress: () => void
  /** Encre sur papier ; crème sur le fond de nuit du rituel (2.3). */
  couleur?: string
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      hitSlop={10}
      style={({ pressed }) => [styles.lien, pressed && styles.presse]}
    >
      <Texte variante="corpsS" couleur={couleur} style={styles.souligne}>
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
