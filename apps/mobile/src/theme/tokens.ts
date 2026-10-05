import type { TextStyle } from 'react-native'

import palette from './palette.json'
import { familles } from './polices'

/** Couleurs de la page Fondations du Figma. Les couleurs `decor` ne portent jamais de texte. */
export const couleurs = palette

/**
 * Styles de texte du Figma (variables de typographie).
 * Figma exprime l'interlettrage en % de la taille : converti ici en points.
 */
export const typo = {
  titreXL: { fontFamily: familles.titre, fontSize: 42, lineHeight: 46, letterSpacing: -0.42 },
  titreL: { fontFamily: familles.titre, fontSize: 32, lineHeight: 36, letterSpacing: -0.16 },
  titreItaliqueL: {
    fontFamily: familles.titreItalique,
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -0.16,
  },
  titreM: { fontFamily: familles.titre, fontSize: 24, lineHeight: 28 },
  corpsM: { fontFamily: familles.corps, fontSize: 16, lineHeight: 24 },
  corpsS: { fontFamily: familles.corps, fontSize: 14, lineHeight: 20 },
  labelM: { fontFamily: familles.corpsSemiBold, fontSize: 15, lineHeight: 20 },
  labelS: { fontFamily: familles.corpsMedium, fontSize: 12, lineHeight: 16, letterSpacing: 0.24 },
  manuscritL: { fontFamily: familles.manuscrit, fontSize: 30, lineHeight: 34 },
  manuscritM: { fontFamily: familles.manuscrit, fontSize: 23, lineHeight: 28 },
  chiffreCase: { fontFamily: familles.titre, fontSize: 30, lineHeight: 30 },
} as const satisfies Record<string, TextStyle>

export type StyleTexte = keyof typeof typo

/** Rayons relevés sur les composants Figma (bouton, puce, case, pastille). */
export const rayons = {
  case: 18,
  pilule: 999,
} as const

export const espacements = {
  xs: 4,
  s: 8,
  m: 12,
  l: 16,
  xl: 24,
  xxl: 32,
} as const

export const ombres = {
  /** Case « Aujourd'hui » : ombre teintée cachet. */
  cachet: '0px 8px 9px rgba(199, 69, 43, 0.35)',
} as const
