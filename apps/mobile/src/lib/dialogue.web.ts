/** Web : Alert de React Native ne fait rien, on passe par le navigateur. */
export async function confirmer(titre: string, message: string, _action: string) {
  return window.confirm(`${titre}\n\n${message}`)
}

/** Web : pas d'appareil photo, on ouvre directement le sélecteur de fichiers. */
export async function choisirSourcePhoto() {
  return 'galerie' as const
}
