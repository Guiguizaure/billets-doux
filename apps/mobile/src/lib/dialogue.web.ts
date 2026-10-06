/** Web : pas d'appareil photo, on ouvre directement le sélecteur de fichiers. */
export async function choisirSourcePhoto() {
  return 'galerie' as const
}
