const CLE = 'billets-doux.visite-demo'

/** Le compte de démo est partagé : la visite guidée se retient dans ce navigateur. */
let enMemoire = false

function stockage(): Storage | null {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null
  } catch {
    return null
  }
}

export const visiteDemo = {
  faite: () => {
    try {
      return enMemoire || stockage()?.getItem(CLE) === '1'
    } catch {
      return enMemoire
    }
  },
  marquerFaite: () => {
    enMemoire = true
    try {
      stockage()?.setItem(CLE, '1')
    } catch {
      // Navigation privée stricte : retenue le temps de l'onglet.
    }
  },
  oublier: () => {
    enMemoire = false
    try {
      stockage()?.removeItem(CLE)
    } catch {
      // Rien à effacer.
    }
  },
}
