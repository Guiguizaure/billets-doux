/** Fuseau horaire IANA du téléphone (ex. « Europe/Paris »), envoyé à l'inscription. */
export function fuseauDuTelephone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris'
  } catch {
    return 'Europe/Paris'
  }
}
