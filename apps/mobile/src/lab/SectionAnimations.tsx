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

type Variante = 'cachet' | 'retournement' | 'douceur'

const variantes: { id: Variante; titre: string; description: string; duree: number }[] = [
  {
    id: 'cachet',
    titre: 'Le cachet se brise',
    description: 'Le cachet gonfle, pivote et disparaît, puis le mot apparaît.',
    duree: 900,
  },
  {
    id: 'retournement',
    titre: 'L’enveloppe se retourne',
    description: 'La carte pivote sur elle-même et montre le mot au dos.',
    duree: 800,
  },
  {
    id: 'douceur',
    titre: 'Apparition douce',
    description: 'L’enveloppe s’efface pendant que le mot se pose.',
    duree: 600,
  },
]

/** Quand la réduction des animations est demandée : simple fondu, sans mouvement. */
const DUREE_REDUITE = 150

export function SectionAnimations() {
  const systemeReduit = useReducedMotion()
  const [simulerReduit, setSimulerReduit] = useState(false)
  const reduit = systemeReduit || simulerReduit

  return (
    <Section titre="Animations : ouverture d’une case">
      <Texte variante="corpsS" couleur={couleurs.texte.encreDouce}>
        Touche une enveloppe pour l’ouvrir, touche-la encore pour la refermer. Réduction des
        animations côté système : {systemeReduit ? 'activée' : 'désactivée'}.
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
      <View style={styles.grille}>
        {variantes.map((v) => (
          <View key={v.id} style={styles.variante}>
            <Texte variante="labelM">{v.titre}</Texte>
            <Texte variante="corpsS" couleur={couleurs.texte.encreDouce}>
              {v.description}
            </Texte>
            <Enveloppe variante={v.id} duree={v.duree} reduit={reduit} />
          </View>
        ))}
      </View>
    </Section>
  )
}

function Enveloppe({
  variante,
  duree,
  reduit,
}: {
  variante: Variante
  duree: number
  reduit: boolean
}) {
  const [ouverte, setOuverte] = useState(false)
  const p = useSharedValue(0)

  const basculer = () => {
    const cible = ouverte ? 0 : 1
    p.set(
      withTiming(cible, {
        duration: reduit ? DUREE_REDUITE : duree,
        easing: Easing.out(Easing.cubic),
      }),
    )
    setOuverte(!ouverte)
  }

  const styleFace = useAnimatedStyle(() => {
    const v = p.get()
    if (reduit) return { opacity: 1 - v }
    switch (variante) {
      case 'cachet':
        return { opacity: interpolate(v, [0.4, 0.7], [1, 0], 'clamp') }
      case 'retournement':
        return {
          transform: [{ perspective: 800 }, { rotateY: `${interpolate(v, [0, 1], [0, 180])}deg` }],
        }
      case 'douceur':
        return {
          opacity: interpolate(v, [0, 0.6], [1, 0], 'clamp'),
          transform: [{ scale: interpolate(v, [0, 1], [1, 0.96]) }],
        }
    }
  })

  const styleCachet = useAnimatedStyle(() => {
    const v = p.get()
    if (reduit || variante !== 'cachet') return {}
    return {
      transform: [
        { scale: interpolate(v, [0, 0.3, 0.6], [1, 1.25, 0], 'clamp') },
        { rotate: `${interpolate(v, [0, 0.6], [0, -25], 'clamp')}deg` },
      ],
    }
  })

  const styleMot = useAnimatedStyle(() => {
    const v = p.get()
    if (reduit) return { opacity: v }
    switch (variante) {
      case 'cachet':
        return {
          opacity: interpolate(v, [0.55, 1], [0, 1], 'clamp'),
          transform: [{ translateY: interpolate(v, [0.55, 1], [8, 0], 'clamp') }],
        }
      case 'retournement':
        return {
          transform: [
            { perspective: 800 },
            { rotateY: `${interpolate(v, [0, 1], [180, 360])}deg` },
          ],
        }
      case 'douceur':
        return {
          opacity: interpolate(v, [0.3, 1], [0, 1], 'clamp'),
          transform: [{ scale: interpolate(v, [0, 1], [1.04, 1]) }],
        }
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
        {/* Encre pleine : l'encre douce sur papier ombre n'atteint que 4,4:1. */}
        <Texte variante="labelS">TOUCHER POUR OUVRIR</Texte>
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
  grille: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  variante: {
    flexGrow: 1,
    flexBasis: 220,
    gap: 8,
  },
  scene: {
    height: 180,
    marginTop: 8,
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
    backfaceVisibility: 'hidden',
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
