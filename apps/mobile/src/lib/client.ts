import { creerClient } from '@billets-doux/shared'

import { apiUrl } from './api'

/**
 * Jeton de la session en cours, en mémoire. Copie persistante : lib/stockage.ts.
 * Hors de React : le client d'API le lit à chaque appel, sans provoquer de rendu.
 */
let jetonCourant: string | null = null

export const jeton = {
  lire: () => jetonCourant,
  definir: (valeur: string | null) => {
    jetonCourant = valeur
  },
}

/** Client unique des routes de l'appli. */
export const api = creerClient({ baseUrl: apiUrl(), jeton: jeton.lire })
