/** Écart entre deux cases du calendrier, en dp. */
export const ECART_CASES = 10

/** Largeur d'une case dans le Figma (grille de 353 dp, écran de 393 dp). */
export const LARGEUR_CASE_FIGMA = 111

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

/**
 * Marge intérieure d'une case : 12 dp comme le Figma, 10 dp quand la case est plus étroite
 * (écrans de moins de 393 dp). Le libellé le plus long, « aujourd’hui », tient alors sur une
 * ligne jusqu'au texte ×1,2 à 360 dp (80 dp de place pour 78,5 dp de texte).
 */
export function margeCase(largeur: number) {
  return largeur < LARGEUR_CASE_FIGMA ? 10 : 12
}
