import { ErreurApi, MESSAGE_RESEAU } from '@billets-doux/shared'
import type { z } from 'zod'

/** Première erreur de chaque champ, pour l'afficher sous le champ concerné. */
export function erreursParChamp(erreur: z.ZodError) {
  const champs: Record<string, string> = {}
  for (const probleme of erreur.issues) {
    const champ = probleme.path.join('.')
    if (champ && !champs[champ]) champs[champ] = probleme.message
  }
  return champs
}

/** Message lisible pour n'importe quelle erreur levée par le client d'API. */
export function messageErreur(e: unknown) {
  if (e instanceof ErreurApi) return e.message
  return MESSAGE_RESEAU
}

/** Retire l'erreur d'un champ dès que la personne le modifie. */
export function sansErreur(erreurs: Record<string, string>, champ: string) {
  if (!(champ in erreurs)) return erreurs
  const reste = { ...erreurs }
  delete reste[champ]
  return reste
}
