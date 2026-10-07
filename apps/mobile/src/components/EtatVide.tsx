import type { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'

import { couleurs } from '@/theme/tokens'

import { Texte } from './Texte'

/** Un écran ou une section sans contenu : une illustration du Figma, un titre, une phrase. */
export function EtatVide({
  illustration,
  titre,
  texte,
  action,
}: {
  illustration?: ReactNode
  titre: string
  texte: string
  action?: ReactNode
}) {
  return (
    <View style={styles.bloc} accessible accessibilityLabel={`${titre}. ${texte}`}>
      {illustration}
      <Texte variante="titreM" style={styles.centre}>
        {titre}
      </Texte>
      <Texte variante="corpsM" couleur={couleurs.texte.encreDouce} style={styles.centre}>
        {texte}
      </Texte>
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  bloc: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 24,
  },
  centre: {
    textAlign: 'center',
    maxWidth: 320,
  },
  action: {
    marginTop: 8,
    alignSelf: 'stretch',
  },
})
