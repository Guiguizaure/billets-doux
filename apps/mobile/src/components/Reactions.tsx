import type { Reaction } from '@billets-doux/shared'
import type { FC } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import type { SvgProps } from 'react-native-svg'

import Coeur from '@/assets/icons/Coeur.svg'
import Joker from '@/assets/icons/Joker.svg'
import Lune from '@/assets/icons/Lune.svg'
import Surprise from '@/assets/icons/Surprise.svg'
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
        {ORDRE.map((r) => {
          const { libelle, Icone, fond } = REACTIONS[r]
          const choisie = valeur === r
          return (
            <Pressable
              key={r}
              onPress={() => onChange(choisie ? null : r)}
              accessibilityRole="radio"
              accessibilityLabel={libelle}
              accessibilityState={{ checked: choisie }}
              hitSlop={4}
              style={({ pressed }) => [
                styles.rond,
                { backgroundColor: fond },
                choisie && styles.choisie,
                pressed && styles.presse,
              ]}
            >
              <Icone width={22} height={22} color={couleurs.texte.encre} />
            </Pressable>
          )
        })}
      </View>
    </View>
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
