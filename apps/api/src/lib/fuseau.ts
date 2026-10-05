/** Vrai si `fuseau` est un fuseau IANA connu du moteur (ex. « Europe/Paris »). */
export function fuseauValide(fuseau: string) {
  try {
    new Intl.DateTimeFormat('fr-FR', { timeZone: fuseau })
    return true
  } catch {
    return false
  }
}
