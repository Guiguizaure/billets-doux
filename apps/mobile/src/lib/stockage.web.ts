const CLE = 'billets-doux.jeton'

/**
 * Version web de démonstration : pas de stockage sécurisé dans un navigateur,
 * on se rabat sur localStorage (indisponible en navigation privée stricte : la session
 * dure alors le temps de l'onglet).
 */
export const stockageJeton = {
  lire: async () => {
    try {
      return window.localStorage.getItem(CLE)
    } catch {
      return null
    }
  },
  ecrire: async (jeton: string) => {
    try {
      window.localStorage.setItem(CLE, jeton)
    } catch {
      // Session non persistée : rien de bloquant.
    }
  },
  effacer: async () => {
    try {
      window.localStorage.removeItem(CLE)
    } catch {
      // Rien à effacer.
    }
  },
}
