import type { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'

import { couleurs, rayons } from '@/theme/tokens'

import { Ecran } from './Ecran'
import { Texte } from './Texte'

/** Onglet dont le contenu arrive à une étape suivante. */
export function EcranProvisoire({
  titre,
  texte,
  etape,
  children,
}: {
  titre: string
  texte: string
  etape: string
  children?: ReactNode
}) {
  return (
    <Ecran bas={false}>
      <Texte variante="titreL" accessibilityRole="header">
        {titre}
      </Texte>
      <View style={styles.carte}>
        <Texte variante="labelS" couleur={couleurs.texte.encreDouce}>
          {etape.toUpperCase()}
        </Texte>
        <Texte variante="corpsM">{texte}</Texte>
      </View>
      {children}
    </Ecran>
  )
}

const styles = StyleSheet.create({
  carte: {
    gap: 8,
    padding: 20,
    borderRadius: rayons.carte,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: couleurs.trait.ligne,
  },
})
