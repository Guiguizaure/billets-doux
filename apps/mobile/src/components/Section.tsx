import type { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'

import { couleurs } from '@/theme/tokens'

import { Texte } from './Texte'

/** Bloc titré, comme les planches de la page Fondations. */
export function Section({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Texte variante="labelS" couleur={couleurs.texte.encreDouce} accessibilityRole="header">
        {titre.toUpperCase()}
      </Texte>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  section: {
    gap: 16,
  },
})
