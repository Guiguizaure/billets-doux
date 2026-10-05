import type { ReactNode } from 'react'
import { KeyboardAvoidingView, Modal, Pressable, StyleSheet, View } from 'react-native'
import Animated, { SlideInDown } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { couleurs } from '@/theme/tokens'

/**
 * Feuille du bas sur un voile (Figma 2.2 et 2.7). Toucher le voile ou le bouton retour
 * d'Android la ferme. Sa montée suit le réglage « réduire les animations » du système.
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
        />
        <Animated.View
          entering={SlideInDown.duration(260)}
          accessibilityViewIsModal
          style={[styles.feuille, { paddingBottom: Math.max(insets.bottom, 12) + 16 }]}
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
    backgroundColor: 'rgba(42, 35, 70, 0.45)',
  },
  feuille: {
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
