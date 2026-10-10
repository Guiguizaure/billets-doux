import { useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'

import { couleurs, rayons } from '@/theme/tokens'

import { GrilleCases, useLargeurCase } from './GrilleCases'

/**
 * Chargement d'un calendrier : des cases « fantômes » à la place d'une roue, pour que l'écran
 * ait déjà sa forme. Elles pulsent doucement (immobiles si les animations sont réduites).
 */
export function CasesFantomes({ nombre = 9 }: { nombre?: number }) {
  const reduit = useReducedMotion()
  const opacite = useSharedValue(1)
  useEffect(() => {
    if (reduit) return
    opacite.set(withRepeat(withTiming(0.5, { duration: 900 }), -1, true))
    return () => cancelAnimation(opacite)
  }, [reduit, opacite])
  const style = useAnimatedStyle(() => ({ opacity: opacite.get() }))
  return (
    <Animated.View
      style={style}
      accessible
      accessibilityLabel="Chargement du calendrier"
      accessibilityRole="progressbar"
    >
      <GrilleCases>
        {Array.from({ length: nombre }, (_, i) => (
          <CaseFantome key={i} />
        ))}
      </GrilleCases>
    </Animated.View>
  )
}

function CaseFantome() {
  return <View style={[styles.case, { width: useLargeurCase() }]} />
}

const styles = StyleSheet.create({
  case: {
    height: 128,
    borderRadius: rayons.case,
    backgroundColor: couleurs.fond.papierOmbre,
  },
})
