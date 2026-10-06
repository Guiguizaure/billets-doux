import { ajouterJours, type CalendrierAuteur, ecartEnJours } from '@billets-doux/shared'

export type JourFrise = { jour: string; etat: 'pret' | 'a_remplir' | 'passe' | 'jour_j' }

/**
 * La frise de 4.1 « un mot chaque jour jusqu'à toi » : de aujourd'hui (chez l'autre) au jour J.
 * Un jour est prêt s'il a un mot daté, à remplir s'il est encore programmable.
 */
export function friseRetrouvailles(cal: CalendrierAuteur, jourJ: string) {
  const jours = new Set(
    cal.mots.flatMap((m) => (m.programmation.mode === 'date' ? [m.programmation.jour] : [])),
  )
  const total = Math.max(0, ecartEnJours(cal.aujourdhui, jourJ))
  const frise: JourFrise[] = Array.from({ length: total + 1 }, (_, i) => {
    const jour = ajouterJours(cal.aujourdhui, i)
    if (jour === jourJ) return { jour, etat: 'jour_j' }
    if (jours.has(jour)) return { jour, etat: 'pret' }
    return { jour, etat: jour < cal.premierJour ? 'passe' : 'a_remplir' }
  })
  const aRemplir = frise.filter((j) => j.etat === 'a_remplir')
  return {
    frise,
    prets: frise.filter((j) => j.etat === 'pret').length,
    aRemplir: aRemplir.length,
    premierARemplir: aRemplir[0]?.jour ?? null,
  }
}
