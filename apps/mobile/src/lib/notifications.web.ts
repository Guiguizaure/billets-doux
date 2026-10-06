/** Web (démo) : pas de notification ; l'appli le dit clairement à la place de la demande. */
export type EtatNotifications = 'autorise' | 'a_demander' | 'bloque' | 'indisponible'

export const notificationsPossibles = false

export async function etatNotifications(): Promise<EtatNotifications> {
  return 'indisponible'
}
export async function enregistrerCetAppareil() {}
export async function demanderNotifications(): Promise<EtatNotifications> {
  return 'indisponible'
}
export async function retirerCetAppareil() {}
export function useOuvertureDesNotifications(_pret: boolean) {}
