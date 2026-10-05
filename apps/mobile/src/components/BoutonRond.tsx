import type { FC } from 'react'
import { StyleSheet, View } from 'react-native'
import type { SvgProps } from 'react-native-svg'

import { couleurs, rayons } from '@/theme/tokens'

/** Composant Figma « Bouton rond » : icône sur une pastille de couleur décor (sans texte dessus). */
export function BoutonRond({ Icone, fond }: { Icone: FC<SvgProps>; fond: string }) {
  return (
    <View style={[styles.rond, { backgroundColor: fond }]} accessible={false}>
      <Icone width={20} height={20} color={couleurs.texte.encre} />
    </View>
  )
}

const styles = StyleSheet.create({
  rond: {
    width: 44,
    height: 44,
    borderRadius: rayons.pilule,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
