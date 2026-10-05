import { Pressable, StyleSheet, View } from 'react-native'

import Retour from '@/assets/icons/Retour.svg'
import { couleurs, rayons } from '@/theme/tokens'

import { Texte } from './Texte'

/** Composant Figma « En-tête » : retour rond à gauche, titre centré. */
export function EnTete({ titre, retour }: { titre: string; retour?: () => void }) {
  return (
    <View style={styles.enTete}>
      <View style={styles.emplacement}>
        {retour ? (
          <Pressable
            onPress={retour}
            accessibilityRole="button"
            accessibilityLabel="Retour"
            hitSlop={8}
            style={({ pressed }) => [styles.retour, pressed && styles.presse]}
          >
            <Retour width={20} height={20} color={couleurs.texte.encre} />
          </Pressable>
        ) : null}
      </View>
      <Texte variante="labelM" accessibilityRole="header">
        {titre}
      </Texte>
      <View style={styles.emplacement} />
    </View>
  )
}

const styles = StyleSheet.create({
  enTete: {
    height: 56,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  emplacement: {
    width: 40,
    height: 40,
  },
  retour: {
    width: 40,
    height: 40,
    borderRadius: rayons.pilule,
    borderWidth: 1,
    borderColor: couleurs.trait.ligne,
    backgroundColor: couleurs.fond.carte,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presse: {
    opacity: 0.7,
  },
})
