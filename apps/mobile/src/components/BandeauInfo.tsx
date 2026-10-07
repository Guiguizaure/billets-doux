import type { FC } from 'react'
import { StyleSheet, View } from 'react-native'
import type { SvgProps } from 'react-native-svg'

import { couleurs, rayons } from '@/theme/tokens'

import { LienTexte } from './LienTexte'
import { Texte } from './Texte'

/** Un message discret en haut d'écran (réseau perdu, session expirée, envoi raté…). */
export function BandeauInfo({
  Icone,
  message,
  action,
}: {
  Icone?: FC<SvgProps>
  message: string
  action?: { libelle: string; onPress: () => void }
}) {
  return (
    <View style={styles.bandeau} accessibilityRole="alert" accessibilityLiveRegion="polite">
      {Icone ? <Icone width={18} height={18} color={couleurs.texte.encre} /> : null}
      <Texte variante="corpsS" style={styles.texte}>
        {message}
      </Texte>
      {action ? <LienTexte libelle={action.libelle} onPress={action.onPress} /> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  bandeau: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: rayons.carte,
    backgroundColor: couleurs.fond.papierOmbre,
  },
  texte: {
    flex: 1,
  },
})
