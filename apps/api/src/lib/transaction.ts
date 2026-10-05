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

function estConflit(e: unknown): boolean {
  const erreur = e as { code?: number; errorLabelSet?: Set<string>; cause?: unknown } | null
  if (!erreur) return false
  if (erreur.code === 112 || erreur.errorLabelSet?.has('TransientTransactionError')) return true
  return erreur.cause ? estConflit(erreur.cause) : false
}
