/**
 * Un court message déposé avant de quitter un écran et lu par l'écran d'arrivée
 * (ex. : « Programmé pour mercredi 7 à 8 h », affiché sur le calendrier).
 */
let enAttente: string | null = null

export const messageFlash = {
  deposer: (message: string) => {
    enAttente = message
  },
  prendre: () => {
    const message = enAttente
    enAttente = null
    return message
  },
}
