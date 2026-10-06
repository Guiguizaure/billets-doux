import { StyleSheet, View } from 'react-native'
import Animated, {
  interpolate,
  type SharedValue,
  useAnimatedProps,
  useAnimatedStyle,
} from 'react-native-reanimated'
import Svg, { Circle, Path } from 'react-native-svg'

import { couleurs } from '@/theme/tokens'

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

/** Illu/enveloppe-cachet du Figma (200 × 150) à 280 × 210, comme dans l'écran 2.3. */
const ECHELLE = 1.4
const LARGEUR = 200 * ECHELLE
const HAUTEUR = 150 * ECHELLE
/** Centre du cachet dans l'illustration (100, 88). */
const CX = 100 * ECHELLE
const CY = 88 * ECHELLE
const CACHET = 46 * ECHELLE
const ANNEAU = 84
const RAYON_ANNEAU = 39
const CIRCONFERENCE = 2 * Math.PI * RAYON_ANNEAU

/**
 * L'enveloppe scellée du rituel (2.3). Le cachet est un calque à part pour s'animer :
 * `appui` (0 → 1) remplit l'anneau pendant l'appui long, `casse` (0 → 1) brise le cachet ;
 * avec « réduire les animations », l'enveloppe s'efface simplement.
 */
export function EnveloppeRituel({
  appui,
  casse,
  reduit,
}: {
  appui: SharedValue<number>
  casse: SharedValue<number>
  reduit: boolean
}) {
  const styleEnveloppe = useAnimatedStyle(() => {
    const c = casse.get()
    return reduit
      ? { opacity: interpolate(c, [0, 1], [1, 0]) }
      : {
          opacity: interpolate(c, [0.45, 1], [1, 0], 'clamp'),
          transform: [{ translateY: interpolate(c, [0.45, 1], [0, 16], 'clamp') }],
        }
  })

  const styleCachet = useAnimatedStyle(() => {
    const c = casse.get()
    const pression = 1 + 0.08 * appui.get()
    if (reduit) return { transform: [{ scale: pression }] }
    return {
      opacity: interpolate(c, [0.4, 0.6], [1, 0], 'clamp'),
      transform: [
        { scale: pression * interpolate(c, [0, 0.3, 0.6], [1, 1.25, 0.2], 'clamp') },
        { rotate: `${interpolate(c, [0, 0.6], [0, -25], 'clamp')}deg` },
      ],
    }
  })

  const styleAnneau = useAnimatedStyle(() => ({
    opacity: interpolate(casse.get(), [0, 0.2], [1, 0], 'clamp'),
  }))

  const propsAnneau = useAnimatedProps(() => ({
    strokeDashoffset: CIRCONFERENCE * (1 - appui.get()),
  }))

  return (
    <View style={styles.scene} accessible={false} importantForAccessibility="no-hide-descendants">
      <View style={[styles.halo, styles.haloExterieur]} />
      <View style={[styles.halo, styles.haloInterieur]} />
      <Animated.View style={[styles.enveloppe, styleEnveloppe]}>
        <Svg width={LARGEUR} height={HAUTEUR} viewBox="0 0 200 150">
          <Path
            d="M182 20H18C13.58 20 10 23.58 10 28V132C10 136.42 13.58 140 18 140H182C186.42 140 190 136.42 190 132V28C190 23.58 186.42 20 182 20Z"
            fill="#FFFBF3"
            stroke="#2A2346"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M179 27H21C18.79 27 17 28.79 17 31V129C17 131.21 18.79 133 21 133H179C181.21 133 183 131.21 183 129V31C183 28.79 181.21 27 179 27Z"
            fill="none"
            stroke="#34408F"
            strokeWidth={5}
            strokeDasharray="10 10"
          />
          <Path
            d="M12 24L100 88L188 24H12Z"
            fill="#EEE2C9"
            stroke="#2A2346"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M176 2L178.08 7.92L184 10L178.08 12.08L176 18L173.92 12.08L168 10L173.92 7.92L176 2Z"
            fill="#F6C453"
            stroke="#2A2346"
            strokeWidth={1.6}
            strokeLinejoin="round"
          />
          <Path
            d="M22 132L23.56 136.44L28 138L23.56 139.56L22 144L20.44 139.56L16 138L20.44 136.44L22 132Z"
            fill="#F4A7B9"
            stroke="#2A2346"
            strokeWidth={1.6}
            strokeLinejoin="round"
          />
        </Svg>
        <Animated.View style={[styles.cachet, styleCachet]}>
          <Svg width={CACHET} height={CACHET} viewBox="77 65 46 46">
            <Path
              d="M100 109C111.6 109 121 99.6 121 88C121 76.4 111.6 67 100 67C88.4 67 79 76.4 79 88C79 99.6 88.4 109 100 109Z"
              fill="#E4573D"
              stroke="#2A2346"
              strokeWidth={2.5}
            />
            <Path
              d="M100 97C91 91 87 86 91 82C94 79 98 81 100 84C102 81 106 79 109 82C113 86 109 91 100 97Z"
              fill="#FFFBF3"
            />
          </Svg>
        </Animated.View>
        <Animated.View style={[styles.anneau, styleAnneau]}>
          <Svg width={ANNEAU} height={ANNEAU}>
            {/* Fond d'anneau couleur « ligne » : on voit ce qu'il reste à tenir. */}
            <Circle
              cx={ANNEAU / 2}
              cy={ANNEAU / 2}
              r={RAYON_ANNEAU}
              stroke={couleurs.trait.ligne}
              strokeWidth={3.5}
              fill="none"
            />
            <AnimatedCircle
              cx={ANNEAU / 2}
              cy={ANNEAU / 2}
              r={RAYON_ANNEAU}
              stroke={couleurs.action.cachet}
              strokeWidth={3.5}
              strokeLinecap="round"
              strokeDasharray={`${CIRCONFERENCE} ${CIRCONFERENCE}`}
              animatedProps={propsAnneau}
              fill="none"
              transform={`rotate(-90 ${ANNEAU / 2} ${ANNEAU / 2})`}
            />
          </Svg>
        </Animated.View>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  scene: {
    width: 345,
    height: 300,
    alignSelf: 'center',
  },
  halo: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 251, 243, 0.06)',
  },
  haloExterieur: {
    left: 32.5,
    top: 10,
    width: 280,
    height: 280,
  },
  haloInterieur: {
    left: 72.5,
    top: 50,
    width: 200,
    height: 200,
  },
  enveloppe: {
    position: 'absolute',
    left: 32.5,
    top: 45,
    width: LARGEUR,
    height: HAUTEUR,
  },
  cachet: {
    position: 'absolute',
    left: CX - CACHET / 2,
    top: CY - CACHET / 2,
  },
  anneau: {
    position: 'absolute',
    left: CX - ANNEAU / 2,
    top: CY - ANNEAU / 2,
  },
})
