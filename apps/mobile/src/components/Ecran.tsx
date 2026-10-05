import type { ReactNode } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native'
import { type Edge, SafeAreaView } from 'react-native-safe-area-context'

import { couleurs } from '@/theme/tokens'

type Props = {
  enTete?: ReactNode
  /** Boutons posés en bas de l'écran, hors de la zone qui défile. */
  actions?: ReactNode
  children: ReactNode
  /** Faux sous une barre d'onglets, qui gère elle-même le bas de l'écran. */
  bas?: boolean
}

/** Mise en page commune : papier, contenu qui défile, actions en bas, clavier évité. */
export function Ecran({ enTete, actions, children, bas = true }: Props) {
  const bords: Edge[] = bas ? ['top', 'bottom', 'left', 'right'] : ['top', 'left', 'right']
  return (
    <SafeAreaView style={styles.ecran} edges={bords}>
      <KeyboardAvoidingView
        style={styles.plein}
        behavior={Platform.select({ ios: 'padding', android: 'height' })}
      >
        <View style={styles.colonne}>
          {enTete}
          <ScrollView
            style={styles.plein}
            contentContainerStyle={styles.contenu}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
          {actions ? <View style={styles.actions}>{actions}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  ecran: {
    flex: 1,
    backgroundColor: couleurs.fond.papier,
  },
  plein: {
    flex: 1,
  },
  colonne: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  contenu: {
    flexGrow: 1,
    gap: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
  },
  actions: {
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
})
