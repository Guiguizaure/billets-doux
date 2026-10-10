import { describe, expect, it } from 'vitest'

import { colonnesCases, ECART_CASES, largeurCase, margeCase } from './grilleCases'

// Largeur de la grille = largeur de l'écran − 2 × 20 dp de marge (Ecran).
const grille = (ecran: number) => ecran - 40

describe('grille du calendrier', () => {
  it('garde trois colonnes jusqu’à ×1,3 et passe à deux au-delà', () => {
    expect(colonnesCases(1)).toBe(3)
    expect(colonnesCases(1.3)).toBe(3)
    expect(colonnesCases(1.31)).toBe(2)
    expect(colonnesCases(2)).toBe(2)
  })

  it('retrouve les 111 dp du Figma sur l’écran de référence (393 dp)', () => {
    expect(largeurCase(grille(393), 1)).toBe(111)
  })

  it.each([360, 390, 393, 412])(
    'tient sur une ligne à %i dp, en texte normal et agrandi',
    (ecran) => {
      for (const fontScale of [1, 1.3, 1.5, 2]) {
        const colonnes = colonnesCases(fontScale)
        const largeur = largeurCase(grille(ecran), fontScale)
        const ligne = colonnes * largeur + (colonnes - 1) * ECART_CASES
        expect(ligne).toBeLessThanOrEqual(grille(ecran))
        // Au plus un dp par colonne perdu à l'arrondi : pas de vide à droite.
        expect(grille(ecran) - ligne).toBeLessThan(colonnes)
      }
    },
  )

  it('donne 100 dp à 360, 110 à 390, 117 à 412 ; 155 à 360 en texte agrandi', () => {
    expect(largeurCase(grille(360), 1)).toBe(100)
    expect(largeurCase(grille(390), 1)).toBe(110)
    expect(largeurCase(grille(412), 1)).toBe(117)
    expect(largeurCase(grille(360), 1.5)).toBe(155)
  })

  it('resserre la marge intérieure des cases plus étroites que le Figma', () => {
    expect(margeCase(largeurCase(grille(360), 1))).toBe(10)
    expect(margeCase(largeurCase(grille(390), 1))).toBe(10)
    expect(margeCase(largeurCase(grille(393), 1))).toBe(12)
    expect(margeCase(largeurCase(grille(412), 1))).toBe(12)
    expect(margeCase(largeurCase(grille(360), 1.5))).toBe(12)
  })
})
