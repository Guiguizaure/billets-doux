import { createContext, type ReactNode, useContext, useState } from 'react'
import { type StyleProp, StyleSheet, useWindowDimensions, View, type ViewStyle } from 'react-native'

import { ECART_CASES, LARGEUR_CASE_FIGMA, largeurCase } from '@/lib/grilleCases'

/** Largeur d'écran au-delà de laquelle Ecran cesse de s'élargir (maxWidth), marges comprises. */
const LARGEUR_MAX_ECRAN = 480
const MARGES_ECRAN = 40

const LargeurCase = createContext<number | null>(null)

/**
 * Grille du calendrier : trois colonnes qui se partagent la largeur disponible (deux en texte
 * agrandi au-delà de ×1,3). Avant la première mesure, la largeur est estimée d'après l'écran.
 */
export function GrilleCases({
  children,
  style,
}: {
  children: ReactNode
  style?: StyleProp<ViewStyle>
}) {
  const { width, fontScale } = useWindowDimensions()
  const [mesure, setMesure] = useState<number | null>(null)
  const estimation = Math.min(width, LARGEUR_MAX_ECRAN) - MARGES_ECRAN
  return (
    <View style={[styles.grille, style]} onLayout={(e) => setMesure(e.nativeEvent.layout.width)}>
      <LargeurCase value={largeurCase(mesure ?? estimation, fontScale)}>{children}</LargeurCase>
    </View>
  )
}

/** Largeur d'une case : celle de la grille qui l'entoure, sinon la taille du Figma (page de test). */
export function useLargeurCase() {
  const largeur = useContext(LargeurCase)
  const { fontScale } = useWindowDimensions()
  return largeur ?? largeurCase(3 * LARGEUR_CASE_FIGMA + 2 * ECART_CASES, fontScale)
}

const styles = StyleSheet.create({
  grille: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ECART_CASES,
  },
})
