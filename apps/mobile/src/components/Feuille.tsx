import { type ReactNode, useEffect } from 'react'
import { KeyboardAvoidingView, Modal, Pressable, StyleSheet, View } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { couleurs } from '@/theme/tokens'

/** Départ de la montée de la feuille, sous le bord de l'écran. */
const DEPART = 480

/**
 * Feuille du bas sur un voile (Figma 2.2 et 2.7). Toucher le voile, le bouton retour
 * d'Android ou Échap sur le web la ferme.
 *
 * Calques explicites : le voile dessous (zIndex 0), la feuille dessus (zIndex 1).
 * La montée est un style animé ordinaire, pas une animation d'entrée (`entering`) :
 * dans un Modal sur Android, celle-ci semble laisser la zone touchable de la feuille à
 * sa position de départ, hors de l'écran (aucun bouton ne réagissait en 2.2).
 */
export function Feuille({
  visible,
  onFermer,
  children,
}: {
  visible: boolean
  onFermer: () => void
  children: ReactNode
}) {
  const insets = useSafeAreaInsets()
  const reduit = useReducedMotion()
  const decalage = useSharedValue(DEPART)

  useEffect(() => {
    if (!visible) return
    if (reduit) {
      decalage.set(0)
      return
    }
    decalage.set(DEPART)
    decalage.set(withTiming(0, { duration: 260, easing: Easing.out(Easing.cubic) }))
  }, [visible, reduit, decalage])

  const styleMontee = useAnimatedStyle(() => ({
    transform: [{ translateY: decalage.get() }],
  }))

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onFermer}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <KeyboardAvoidingView behavior="padding" style={styles.plein}>
        <Pressable
          style={styles.voile}
          onPress={onFermer}
          accessibilityRole="button"
          accessibilityLabel="Fermer"
          // Au clavier (web), le focus va d'abord au contenu de la feuille ; Échap ferme.
          focusable={false}
        />
        <Animated.View
          accessibilityViewIsModal
          style={[styles.feuille, styleMontee, { paddingBottom: Math.max(insets.bottom, 12) + 16 }]}
        >
          <View style={styles.poignee} />
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  plein: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  voile: {
    ...StyleSheet.absoluteFill,
    zIndex: 0,
    backgroundColor: 'rgba(42, 35, 70, 0.45)',
  },
  feuille: {
    zIndex: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: couleurs.fond.carte,
  },
  poignee: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: couleurs.trait.ligne,
  },
})
