import { useState } from 'react'
import { Pressable, StyleSheet, Switch, View } from 'react-native'
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'

import { Section } from '@/components/Section'
import { Texte } from '@/components/Texte'
import { couleurs, rayons } from '@/theme/tokens'

/** Choix validé : le cachet se brise ; apparition douce quand les animations sont réduites. */
const DUREE_CACHET = 900
const DUREE_DOUCE = 600

export function SectionAnimations() {
  const systemeReduit = useReducedMotion()
  const [simulerReduit, setSimulerReduit] = useState(false)
  const reduit = systemeReduit || simulerReduit

  return (
    <Section titre="Animation : ouverture d’une case">
      <Texte variante="corpsS" couleur={couleurs.texte.encreDouce}>
        Choix retenu : le cachet se brise. Avec « réduire les animations », le mot apparaît
        doucement. Réduction côté système : {systemeReduit ? 'activée' : 'désactivée'}.
      </Texte>
      <View style={styles.interrupteur}>
        <Switch
          value={simulerReduit}
          onValueChange={setSimulerReduit}
          accessibilityLabel="Simuler la réduction des animations"
          trackColor={{ true: couleurs.texte.encre, false: couleurs.trait.ligne }}
          thumbColor={couleurs.fond.carte}
        />
        <Texte variante="corpsM">Simuler « réduire les animations »</Texte>
      </View>
      <Texte variante="labelM">{reduit ? 'Apparition douce' : 'Le cachet se brise'}</Texte>
      <Enveloppe reduit={reduit} />
    </Section>
  )
}

function Enveloppe({ reduit }: { reduit: boolean }) {
  const [ouverte, setOuverte] = useState(false)
  const p = useSharedValue(0)

  const basculer = () => {
    p.set(
      withTiming(ouverte ? 0 : 1, {
        duration: reduit ? DUREE_DOUCE : DUREE_CACHET,
        easing: Easing.out(Easing.cubic),
      }),
    )
    setOuverte(!ouverte)
  }

  const styleFace = useAnimatedStyle(() => {
    const v = p.get()
    if (reduit) {
      return {
        opacity: interpolate(v, [0, 0.6], [1, 0], 'clamp'),
        transform: [{ scale: interpolate(v, [0, 1], [1, 0.96]) }],
      }
    }
    return { opacity: interpolate(v, [0.4, 0.7], [1, 0], 'clamp') }
  })

  const styleCachet = useAnimatedStyle(() => {
    const v = p.get()
    if (reduit) return {}
    return {
      transform: [
        { scale: interpolate(v, [0, 0.3, 0.6], [1, 1.25, 0], 'clamp') },
        { rotate: `${interpolate(v, [0, 0.6], [0, -25], 'clamp')}deg` },
      ],
    }
  })

  const styleMot = useAnimatedStyle(() => {
    const v = p.get()
    if (reduit) {
      return {
        opacity: interpolate(v, [0.3, 1], [0, 1], 'clamp'),
        transform: [{ scale: interpolate(v, [0, 1], [1.04, 1]) }],
      }
    }
    return {
      opacity: interpolate(v, [0.55, 1], [0, 1], 'clamp'),
      transform: [{ translateY: interpolate(v, [0.55, 1], [8, 0], 'clamp') }],
    }
  })

  return (
    <Pressable
      onPress={basculer}
      accessibilityRole="button"
      accessibilityLabel={ouverte ? 'Refermer le mot' : 'Ouvrir le mot'}
      accessibilityState={{ expanded: ouverte }}
      style={styles.scene}
    >
      <Animated.View style={[styles.face, styles.mot, styleMot]}>
        <Texte variante="manuscritL">Bonjour toi, j’ai rêvé de la mer</Texte>
      </Animated.View>
      <Animated.View style={[styles.face, styles.scellee, styleFace]}>
        <Animated.View style={[styles.cachet, styleCachet]}>
          <View style={styles.cachetInterieur} />
        </Animated.View>
        <Texte variante="labelS" couleur={couleurs.texte.encreDouce}>
          TOUCHER POUR OUVRIR
        </Texte>
      </Animated.View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  interrupteur: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scene: {
    height: 180,
    maxWidth: 360,
  },
  face: {
    ...StyleSheet.absoluteFill,
    borderRadius: rayons.case,
    borderWidth: 1,
    borderColor: couleurs.trait.ligne,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 12,
  },
  scellee: {
    backgroundColor: couleurs.fond.papierOmbre,
  },
  mot: {
    backgroundColor: couleurs.fond.carte,
  },
  cachet: {
    width: 52,
    height: 52,
    borderRadius: rayons.pilule,
    backgroundColor: couleurs.action.cachet,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cachetInterieur: {
    width: 36,
    height: 36,
    borderRadius: rayons.pilule,
    borderWidth: 1.5,
    borderColor: couleurs.texte.surCachet,
    opacity: 0.6,
  },
})
