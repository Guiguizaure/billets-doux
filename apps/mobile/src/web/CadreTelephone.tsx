import type { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'

import { couleurs } from '@/theme/tokens'

export type VarianteCadre = 'telephone' | 'carte' | 'timbre'

/** Taille d'écran d'un téléphone courant (celle des maquettes du Figma). */
export const ECRAN = { largeur: 393, hauteur: 852 }

/**
 * Le cadre qui entoure l'appli sur grand écran (version web de démonstration).
 * - `telephone` : un vrai téléphone, bordure encre ;
 * - `carte` : une carte crème à fine bordure, ombre douce ;
 * - `timbre` : bord perforé comme un timbre, clin d'œil à l'univers de l'appli.
 */
export function CadreTelephone({
  variante,
  children,
}: {
  variante: VarianteCadre
  children: ReactNode
}) {
  return (
    <View style={[styles.base, styles[variante]]}>
      <View style={[styles.ecran, ecrans[variante]]}>{children}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'center',
  },
  telephone: {
    padding: 12,
    borderRadius: 62,
    backgroundColor: couleurs.texte.encre,
    boxShadow: '0px 40px 80px -30px rgba(42, 35, 70, 0.55)',
  },
  carte: {
    borderRadius: 44,
    borderWidth: 1,
    borderColor: couleurs.trait.ligne,
    backgroundColor: couleurs.fond.carte,
    boxShadow: '0px 30px 60px -24px rgba(42, 35, 70, 0.35)',
  },
  timbre: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 7,
    borderStyle: 'dotted',
    borderColor: couleurs.fond.papierOmbre,
    backgroundColor: couleurs.fond.carte,
    boxShadow: '0px 24px 50px -24px rgba(42, 35, 70, 0.35)',
  },
  ecran: {
    width: ECRAN.largeur,
    height: ECRAN.hauteur,
    overflow: 'hidden',
    backgroundColor: couleurs.fond.papier,
  },
})

const ecrans = StyleSheet.create({
  telephone: { borderRadius: 50 },
  carte: { borderRadius: 43 },
  timbre: { borderRadius: 4 },
})
