import type { PayloadRequest } from 'payload'
import { commitTransaction, initTransaction, killTransaction } from 'payload'

import { ErreurMetier } from './erreurs'

/**
 * Exécute `travail` dans une transaction Mongo (replica set requis, comme sur Atlas).
 * Deux écritures concurrentes sur le même document : l'une échoue → 409, l'appli réessaie.
 */
export async function enTransaction<T>(req: PayloadRequest, travail: () => Promise<T>) {
  const nouvelle = await initTransaction(req)
  try {
    const resultat = await travail()
    if (nouvelle) await commitTransaction(req)
    return resultat
  } catch (e) {
    if (nouvelle) await killTransaction(req)
    if (estConflit(e)) {
      throw new ErreurMetier(409, 'Quelqu’un a été plus rapide. Réessaie dans un instant.')
    }
    throw e
  }
}

/**
 * Rejoue `travail` en cas de conflit d'écriture Mongo (WriteConflict, TransientTransactionError) :
 * jusqu'à `essais` fois au total, après une courte pause croissante.
 */
export async function avecReprise<T>(
  req: PayloadRequest,
  travail: () => Promise<T>,
  essais = 3,
): Promise<T> {
  for (let essai = 1; ; essai++) {
    try {
      return await travail()
    } catch (e) {
      if (essai >= essais || !estConflit(e)) throw e
      // La transaction avortée ne doit pas être reprise par l'essai suivant.
      delete req.transactionID
      await new Promise((fin) => setTimeout(fin, 20 * essai + Math.random() * 30))
    }
  }
}

export function estConflit(e: unknown): boolean {
  const erreur = e as { code?: number; errorLabelSet?: Set<string>; cause?: unknown } | null
  if (!erreur) return false
  if (erreur.code === 112 || erreur.errorLabelSet?.has('TransientTransactionError')) return true
  return erreur.cause ? estConflit(erreur.cause) : false
}
