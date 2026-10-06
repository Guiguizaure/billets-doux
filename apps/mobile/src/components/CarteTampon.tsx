import { useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'

import Valider from '@/assets/icons/Valider.svg'
import { couleurs, rayons } from '@/theme/tokens'

import { Texte } from './Texte'

/**
 * Carte de confirmation « Programmé pour mercredi 7 à 8 h » : le cachet tombe dessus comme un
 * tampon (choix validé à l'étape 8). Simple apparition si les animations sont réduites.
 */
export function CarteTampon({ message }: { message: string }) {
  const reduit = useReducedMotion()
  const p = useSharedValue(0)
  useEffect(() => {
    p.set(withTiming(1, { duration: reduit ? 300 : 420, easing: Easing.out(Easing.back(2)) }))
  }, [p, reduit])
  const style = useAnimatedStyle(() => {
    const v = p.get()
    return reduit
      ? { opacity: v }
      : {
          opacity: Math.min(1, v * 2),
          transform: [{ scale: 1.8 - 0.8 * v }, { rotate: '-12deg' }],
        }
  })
  return (
    <View style={styles.carte} accessibilityLiveRegion="polite">
      <Animated.View style={[styles.cachet, style]}>
        <Valider width={20} height={20} color={couleurs.texte.surCachet} />
      </Animated.View>
      <Texte variante="labelM" style={styles.texte}>
        {message}
      </Texte>
    </View>
  )
}

const styles = StyleSheet.create({
  carte: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: rayons.carte,
    borderWidth: 1,
    borderColor: couleurs.trait.ligne,
    backgroundColor: couleurs.fond.carte,
  },
  cachet: {
    width: 44,
    height: 44,
    borderRadius: rayons.pilule,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: couleurs.action.cachet,
  },
  texte: {
    flex: 1,
  },
})
