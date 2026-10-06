import type { Reaction } from '@billets-doux/shared'
import type { FC } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import type { SvgProps } from 'react-native-svg'

import Coeur from '@/assets/icons/Coeur.svg'
import Joker from '@/assets/icons/Joker.svg'
import Lune from '@/assets/icons/Lune.svg'
import Surprise from '@/assets/icons/Surprise.svg'
import { vibrer } from '@/lib/vibrer'
import { couleurs, rayons } from '@/theme/tokens'

import { Texte } from './Texte'

/** Les quatre réactions du Figma (2.4, 2.7), dans l'ordre de la maquette. */
export const REACTIONS: Record<Reaction, { libelle: string; Icone: FC<SvgProps>; fond: string }> = {
  coeur: { libelle: 'Cœur', Icone: Coeur, fond: couleurs.decor.rose },
  lune: { libelle: 'Lune', Icone: Lune, fond: couleurs.decor.lavande },
  etoile: { libelle: 'Étoile', Icone: Joker, fond: couleurs.decor.soleil },
  etincelle: { libelle: 'Étincelle', Icone: Surprise, fond: couleurs.decor.sauge },
}

const ORDRE: Reaction[] = ['coeur', 'lune', 'etoile', 'etincelle']

/** « Ta réaction » : un geste, modifiable ; toucher la réaction choisie la retire. */
export function Reactions({
  valeur,
  onChange,
}: {
  valeur: Reaction | null
  onChange: (reaction: Reaction | null) => void
}) {
  return (
    <View style={styles.bloc}>
      <Texte variante="labelS" couleur={couleurs.texte.encreDouce} accessible={false}>
        TA RÉACTION
      </Texte>
      <View style={styles.rangee} accessibilityRole="radiogroup" accessibilityLabel="Ta réaction">
        {ORDRE.map((r) => (
          <PastilleChoix
            key={r}
            reaction={r}
            choisie={valeur === r}
            onPress={() => onChange(valeur === r ? null : r)}
          />
        ))}
      </View>
    </View>
  )
}

/**
 * Une réaction à choisir : petit rebond (220 ms, choix validé à l'étape 8, raccourci) et
 * vibration légère. Sans rebond si le système demande moins d'animations.
 */
function PastilleChoix({
  reaction,
  choisie,
  onPress,
}: {
  reaction: Reaction
  choisie: boolean
  onPress: () => void
}) {
  const { libelle, Icone, fond } = REACTIONS[reaction]
  const reduit = useReducedMotion()
  const echelle = useSharedValue(1)
  const style = useAnimatedStyle(() => ({ transform: [{ scale: echelle.get() }] }))
  return (
    <Pressable
      onPress={() => {
        if (!reduit) {
          echelle.set(
            withSequence(
              withTiming(1.2, { duration: 80, easing: Easing.out(Easing.quad) }),
              withTiming(1, { duration: 140, easing: Easing.out(Easing.quad) }),
            ),
          )
        }
        vibrer.reaction()
        onPress()
      }}
      accessibilityRole="radio"
      accessibilityLabel={libelle}
      accessibilityState={{ checked: choisie }}
      hitSlop={4}
    >
      {({ pressed }) => (
        <Animated.View
          style={[
            styles.rond,
            { backgroundColor: fond },
            choisie && styles.choisie,
            pressed && styles.presse,
            style,
          ]}
        >
          <Icone width={22} height={22} color={couleurs.texte.encre} />
        </Animated.View>
      )}
    </Pressable>
  )
}

/** Pastille d'une réaction reçue (vue de l'auteur). */
export function PastilleReaction({
  reaction,
  taille = 44,
}: {
  reaction: Reaction
  taille?: number
}) {
  const { Icone, fond } = REACTIONS[reaction]
  return (
    <View
      style={[styles.rond, { width: taille, height: taille, backgroundColor: fond }]}
      accessible={false}
    >
      <Icone width={taille * 0.45} height={taille * 0.45} color={couleurs.texte.encre} />
    </View>
  )
}

const styles = StyleSheet.create({
  bloc: {
    gap: 12,
  },
  rangee: {
    flexDirection: 'row',
    gap: 12,
  },
  rond: {
    width: 52,
    height: 52,
    borderRadius: rayons.pilule,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choisie: {
    borderWidth: 2,
    borderColor: couleurs.texte.encre,
  },
  presse: {
    opacity: 0.75,
  },
})
