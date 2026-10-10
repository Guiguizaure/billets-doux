/** Écart entre deux cases du calendrier, en dp. */
export const ECART_CASES = 10

/** Texte agrandi au-delà de ×1,3 : deux colonnes au lieu de trois, et la case s'allonge. */
export function colonnesCases(fontScale: number) {
  return fontScale > 1.3 ? 2 : 3
}

/**
 * Largeur d'une case : les colonnes se partagent la largeur de la grille, écarts déduits.
 * Arrondie vers le bas pour qu'une ligne ne déborde jamais (353 dp → 111, comme le Figma).
 */
export function largeurCase(largeurGrille: number, fontScale: number) {
  const colonnes = colonnesCases(fontScale)
  return Math.floor((largeurGrille - ECART_CASES * (colonnes - 1)) / colonnes)
}
