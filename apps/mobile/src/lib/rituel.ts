/**
 * Le rituel (2.3) se propose une fois par lancement de l'appli, si un mot attend :
 * « Plus tard » le repousse au lancement suivant. Toucher la notification « Un mot de Lina
 * t'attend » le repropose, même si l'appli était déjà ouverte.
 */
let propose = false

export const rituel = {
  aProposer: () => !propose,
  marquerPropose: () => {
    propose = true
  },
  reproposer: () => {
    propose = false
  },
}
