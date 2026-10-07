import { useSyncExternalStore } from 'react'

/**
 * État du réseau vu par l'appli, déduit des appels à l'API : un appel qui échoue faute de
 * réseau passe en « hors ligne », le premier qui aboutit revient à « ok ».
 */
type Etat = 'ok' | 'hors_ligne'

let etat: Etat = 'ok'
const abonnes = new Set<() => void>()

export const reseau = {
  etat: () => etat,
  signaler: (suivant: Etat) => {
    if (suivant === etat) return
    etat = suivant
    abonnes.forEach((f) => f())
  },
  abonner: (f: () => void) => {
    abonnes.add(f)
    return () => {
      abonnes.delete(f)
    }
  },
}

export const useReseau = () => useSyncExternalStore(reseau.abonner, reseau.etat, reseau.etat)

/** Session refusée par l'API (jeton expiré ou révoqué) : la session écoute et se ferme. */
const surExpiration = new Set<() => void>()
export const sessionExpiree = {
  signaler: () => surExpiration.forEach((f) => f()),
  ecouter: (f: () => void) => {
    surExpiration.add(f)
    return () => {
      surExpiration.delete(f)
    }
  },
}

/** Routes où un refus ne veut pas dire « session expirée » (mauvais mot de passe…). */
const SANS_SESSION = [
  '/api/comptes/connexion',
  '/api/comptes/inscription',
  '/api/comptes/demo',
  '/api/comptes/suppression',
  '/api/users/logout',
]

/** Le `fetch` du client d'API : il renseigne l'état du réseau et repère une session expirée. */
export const fetchSuivi: typeof fetch = async (entree, init) => {
  let reponse: Response
  try {
    reponse = await fetch(entree, init)
  } catch (e) {
    reseau.signaler('hors_ligne')
    throw e
  }
  reseau.signaler('ok')
  const url = typeof entree === 'string' ? entree : entree instanceof URL ? entree.href : entree.url
  if (reponse.status === 401 && !SANS_SESSION.some((chemin) => url.includes(chemin))) {
    sessionExpiree.signaler()
  }
  return reponse
}
