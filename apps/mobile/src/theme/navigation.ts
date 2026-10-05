import { couleurs } from './tokens'

/**
 * Options communes à toutes les piles d'écrans. Transition validée sur la page de test :
 * le fondu (aussi adapté quand les animations sont réduites, car sans mouvement).
 */
export const optionsPile = {
  headerShown: false,
  contentStyle: { backgroundColor: couleurs.fond.papier },
  animation: 'fade',
} as const
