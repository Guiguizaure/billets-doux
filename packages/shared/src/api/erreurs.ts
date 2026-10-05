import { z } from 'zod'

/** Corps d'erreur renvoyé par les routes de l'appli. */
export const CorpsErreur = z.object({
  erreur: z.string(),
  /** Erreurs par champ, pour les formulaires. */
  champs: z.record(z.string(), z.string()).optional(),
})
export type CorpsErreur = z.infer<typeof CorpsErreur>

export class ErreurApi extends Error {
  constructor(
    message: string,
    readonly statut: number,
    readonly champs: Record<string, string> = {},
  ) {
    super(message)
    this.name = 'ErreurApi'
  }
}

export const MESSAGE_RESEAU = 'Impossible de joindre Billets doux. Vérifie ta connexion.'
