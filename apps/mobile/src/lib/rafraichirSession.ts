import { Platform } from 'react-native'

import { api, jeton } from './client'
import { stockageJeton } from './stockage'

let enCours: Promise<string> | null = null

/**
 * Prolonge la session : un seul rafraîchissement à la fois. Les appels simultanés partagent
 * la même promesse. Sur le web, la page de démonstration et l'appli dans son cadre (même
 * navigateur, même jeton) passent l'une après l'autre : la seconde reprend le jeton que la
 * première vient d'obtenir, sans rafraîchir une deuxième fois.
 * Renvoie le jeton à utiliser (déjà enregistré).
 */
export function rafraichirSession(): Promise<string> {
  enCours ??= verrou(async () => {
    const enregistre = await stockageJeton.lire()
    const courant = jeton.lire()
    if (enregistre && courant && enregistre !== courant) {
      jeton.definir(enregistre)
      return enregistre
    }
    const session = await api.rafraichir()
    jeton.definir(session.jeton)
    await stockageJeton.ecrire(session.jeton)
    return session.jeton
  }).finally(() => {
    enCours = null
  })
  return enCours
}

/** Verrou partagé par les cadres d'un même site (Web Locks) ; rien à verrouiller ailleurs. */
function verrou<T>(travail: () => Promise<T>): Promise<T> {
  const verrous = Platform.OS === 'web' && typeof navigator !== 'undefined' ? navigator.locks : null
  return verrous ? verrous.request('billets-doux.rafraichir', travail) : travail()
}
