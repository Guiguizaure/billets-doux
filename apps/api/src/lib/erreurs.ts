/** Erreur métier : statut HTTP + message en français, renvoyés tels quels à l'appli. */
export class ErreurMetier extends Error {
  constructor(
    readonly statut: number,
    message: string,
    readonly champs?: Record<string, string>,
  ) {
    super(message)
    this.name = 'ErreurMetier'
  }
}
