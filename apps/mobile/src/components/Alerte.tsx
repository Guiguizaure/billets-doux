import { StyleSheet, View } from 'react-native'

import { couleurs } from '@/theme/tokens'

import { Texte } from './Texte'

/** Message d'erreur général d'un écran (texte en encre, filet rouge cachet). */
export function Alerte({ message }: { message: string }) {
  return (
    <View style={styles.alerte} accessibilityRole="alert" accessibilityLiveRegion="assertive">
      <Texte variante="corpsS">{message}</Texte>
    </View>
  )
}

const styles = StyleSheet.create({
  alerte: {
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: couleurs.action.cachet,
    backgroundColor: couleurs.fond.carte,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
})
