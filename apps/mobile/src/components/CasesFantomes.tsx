import { useEffect } from 'react'
import { StyleSheet, useWindowDimensions, View } from 'react-native'
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'

import { couleurs, rayons } from '@/theme/tokens'

/**
 * Chargement d'un calendrier : des cases « fantômes » à la place d'une roue, pour que l'écran
 * ait déjà sa forme. Elles pulsent doucement (immobiles si les animations sont réduites).
 */
export function CasesFantomes({ nombre = 9 }: { nombre?: number }) {
  const reduit = useReducedMotion()
  const { fontScale } = useWindowDimensions()
  const opacite = useSharedValue(1)
  useEffect(() => {
    if (reduit) return
    opacite.set(withRepeat(withTiming(0.5, { duration: 900 }), -1, true))
    return () => cancelAnimation(opacite)
  }, [reduit, opacite])
  const style = useAnimatedStyle(() => ({ opacity: opacite.get() }))
  return (
    <Animated.View
      style={[styles.grille, style]}
      accessible
      accessibilityLabel="Chargement du calendrier"
      accessibilityRole="progressbar"
    >
      {Array.from({ length: nombre }, (_, i) => (
        <View key={i} style={[styles.case, fontScale > 1.3 && styles.large]} />
      ))}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  large: {
    width: 171,
  },
  grille: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  case: {
    width: 111,
    height: 128,
    borderRadius: rayons.case,
    backgroundColor: couleurs.fond.papierOmbre,
  },
})
