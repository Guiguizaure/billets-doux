import { Pressable, StyleSheet } from 'react-native'

import Apercu from '@/assets/icons/Apercu.svg'
import { couleurs } from '@/theme/tokens'

/** Afficher / masquer le mot de passe (icône Figma « Aperçu »). */
export function BoutonVoir({ visible, basculer }: { visible: boolean; basculer: () => void }) {
  return (
    <Pressable
      onPress={basculer}
      accessibilityRole="button"
      accessibilityLabel={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
      hitSlop={10}
      style={({ pressed }) => [styles.voir, (pressed || visible) && styles.actif]}
    >
      <Apercu width={20} height={20} color={couleurs.texte.encre} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  voir: {
    padding: 4,
    opacity: 0.6,
  },
  actif: {
    opacity: 1,
  },
})
