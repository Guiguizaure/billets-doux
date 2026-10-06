import * as Haptics from 'expo-haptics'
import { useEffect, useState } from 'react'
import { Platform, Pressable, StyleSheet, Switch, View } from 'react-native'
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated'

import Mot from '@/assets/icons/Mot.svg'
import Valider from '@/assets/icons/Valider.svg'
import { Bouton } from '@/components/Bouton'
import { Case } from '@/components/Case'
import { REACTIONS } from '@/components/Reactions'
import { Section } from '@/components/Section'
import { Texte } from '@/components/Texte'
import { couleurs, rayons } from '@/theme/tokens'

/**
 * Étape 8 : les quatre animations proposées, à garder ou non. Toutes s'effacent quand le
 * système demande moins d'animations (simulable ici).
 */
export function SectionFinitions() {
  const systeme = useReducedMotion()
  const [simule, setSimule] = useState(false)
  const reduit = systeme || simule
  return (
    <Section titre="Étape 8 · Animations (à choisir)">
      <View style={styles.interrupteur}>
        <Switch
          value={simule}
          onValueChange={setSimule}
          accessibilityLabel="Simuler « réduire les animations »"
          trackColor={{ true: couleurs.texte.encre, false: couleurs.trait.ligne }}
          thumbColor={couleurs.fond.carte}
        />
        <Texte variante="corpsS">
          Simuler « réduire les animations » (système : {systeme ? 'activé' : 'désactivé'})
        </Texte>
      </View>
      <View style={styles.grille}>
        <Fiche titre="A · La case du jour respire" detail="Échelle 1 → 1,03, 1,6 s, en boucle.">
          <CaseQuiRespire reduit={reduit} />
        </Fiche>
        <Fiche titre="B · La réaction rebondit" detail="Ressort à la sélection.">
          <RebondReaction reduit={reduit} />
        </Fiche>
        <Fiche
          titre="C · Tampon « programmé »"
          detail="Le cachet tombe sur la carte de confirmation."
        >
          <Tampon reduit={reduit} />
        </Fiche>
        <Fiche titre="D · Vibration" detail="Sur le téléphone seulement (nouveau build).">
          <Vibrations />
        </Fiche>
      </View>
    </Section>
  )
}

function Fiche({
  titre,
  detail,
  children,
}: {
  titre: string
  detail: string
  children: React.ReactNode
}) {
  return (
    <View style={styles.fiche}>
      <Texte variante="labelM">{titre}</Texte>
      <Texte variante="corpsS" couleur={couleurs.texte.encreDouce}>
        {detail}
      </Texte>
      <View style={styles.scene}>{children}</View>
    </View>
  )
}

function CaseQuiRespire({ reduit }: { reduit: boolean }) {
  const echelle = useSharedValue(1)
  useEffect(() => {
    if (reduit) {
      cancelAnimation(echelle)
      echelle.set(1)
      return
    }
    echelle.set(
      withRepeat(
        withSequence(
          withTiming(1.03, { duration: 800, easing: Easing.inOut(Easing.sin) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
      ),
    )
    return () => cancelAnimation(echelle)
  }, [reduit, echelle])
  const style = useAnimatedStyle(() => ({ transform: [{ scale: echelle.get() }] }))
  return (
    <Animated.View style={style}>
      <Case
        etat="aujourdhui"
        jourSemaine="jeu."
        jour="15"
        info="à ouvrir"
        Icone={Mot}
        libelleAccessible="Jeudi 15, à ouvrir"
      />
    </Animated.View>
  )
}

function RebondReaction({ reduit }: { reduit: boolean }) {
  const [choisie, setChoisie] = useState<keyof typeof REACTIONS | null>(null)
  return (
    <View style={styles.reactions}>
      {(Object.keys(REACTIONS) as (keyof typeof REACTIONS)[]).map((r) => (
        <PastilleRebond
          key={r}
          reaction={r}
          choisie={choisie === r}
          reduit={reduit}
          onPress={() => setChoisie(choisie === r ? null : r)}
        />
      ))}
    </View>
  )
}

function PastilleRebond({
  reaction,
  choisie,
  reduit,
  onPress,
}: {
  reaction: keyof typeof REACTIONS
  choisie: boolean
  reduit: boolean
  onPress: () => void
}) {
  const { Icone, fond, libelle } = REACTIONS[reaction]
  const echelle = useSharedValue(1)
  const style = useAnimatedStyle(() => ({ transform: [{ scale: echelle.get() }] }))
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={libelle}
      onPress={() => {
        if (!reduit) {
          echelle.set(
            withSequence(withTiming(1.25, { duration: 110 }), withSpring(1, { damping: 6 })),
          )
        }
        onPress()
      }}
    >
      <Animated.View
        style={[styles.pastille, { backgroundColor: fond }, choisie && styles.choisie, style]}
      >
        <Icone width={22} height={22} color={couleurs.texte.encre} />
      </Animated.View>
    </Pressable>
  )
}

function Tampon({ reduit }: { reduit: boolean }) {
  const p = useSharedValue(1)
  const rejouer = () => {
    p.set(0)
    p.set(withTiming(1, { duration: reduit ? 300 : 420, easing: Easing.out(Easing.back(2)) }))
  }
  const style = useAnimatedStyle(() => {
    const v = p.get()
    return reduit
      ? { opacity: v }
      : { opacity: Math.min(1, v * 2), transform: [{ scale: 1.8 - 0.8 * v }, { rotate: '-12deg' }] }
  })
  return (
    <View style={styles.tampon}>
      <View style={styles.confirmation}>
        <Animated.View style={[styles.cachet, style]}>
          <Valider width={20} height={20} color={couleurs.texte.surCachet} />
        </Animated.View>
        <Texte variante="labelM" style={styles.flex}>
          Programmé pour mercredi 7 à 8 h
        </Texte>
      </View>
      <Bouton libelle="Rejouer" variante="discret" onPress={rejouer} />
    </View>
  )
}

function Vibrations() {
  if (Platform.OS === 'web') {
    return (
      <Texte variante="corpsS" couleur={couleurs.texte.encreDouce}>
        Le navigateur ne vibre pas : à essayer sur le téléphone.
      </Texte>
    )
  }
  return (
    <View style={styles.vibrations}>
      <Bouton
        libelle="Le cachet se brise"
        variante="secondaire"
        onPress={() => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
      />
      <Bouton
        libelle="Réaction choisie"
        variante="secondaire"
        onPress={() => void Haptics.selectionAsync()}
      />
      <Bouton
        libelle="Mot programmé"
        variante="secondaire"
        onPress={() => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)}
      />
    </View>
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
  fiche: {
    flexGrow: 1,
    flexBasis: 320,
    gap: 6,
    padding: 16,
    borderRadius: rayons.carte,
    borderWidth: 1,
    borderColor: couleurs.trait.ligne,
    backgroundColor: couleurs.fond.carte,
  },
  scene: {
    minHeight: 150,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  reactions: {
    flexDirection: 'row',
    gap: 12,
  },
  pastille: {
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
  tampon: {
    alignSelf: 'stretch',
    gap: 8,
  },
  confirmation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: rayons.carte,
    borderWidth: 1,
    borderColor: couleurs.trait.ligne,
    backgroundColor: couleurs.fond.papier,
  },
  cachet: {
    width: 44,
    height: 44,
    borderRadius: rayons.pilule,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: couleurs.action.cachet,
  },
  flex: {
    flex: 1,
  },
  vibrations: {
    gap: 10,
  },
})
