import type { VueMedia } from '@billets-doux/shared'

/**
 * Passe le vocal enregistré sur l'écran 3.3 à l'écran d'écriture qui l'a demandé
 * (l'écran 3.4 le récupère quand il reprend le focus).
 */
let vocalEnAttente: VueMedia | null = null

export const boiteAuxLettres = {
  deposerVocal: (vocal: VueMedia) => {
    vocalEnAttente = vocal
  },
  prendreVocal: () => {
    const vocal = vocalEnAttente
    vocalEnAttente = null
    return vocal
  },
}
