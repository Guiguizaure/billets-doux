import type { CalendrierAuteur, MotProgramme } from '@billets-doux/shared'
import { describe, expect, it } from 'vitest'

import { friseRetrouvailles } from './retrouvailles'

const mot = (jour: string) =>
  ({
    id: jour,
    programmation: { mode: 'date', jour, unlockAt: `${jour}T06:00:00.000Z` },
  }) as MotProgramme

// Jeudi 15 octobre 2026, l'heure de Lina est passée : le premier jour programmable est demain.
const cal = (mots: MotProgramme[]) =>
  ({ aujourdhui: '2026-10-15', premierJour: '2026-10-16', mots }) as CalendrierAuteur

describe('frise des retrouvailles', () => {
  it('jours prêts, à remplir, passé, et le jour J', () => {
    const r = friseRetrouvailles(cal([mot('2026-10-16'), mot('2026-10-18')]), '2026-10-19')
    expect(r.frise.map((j) => j.etat)).toEqual(['passe', 'pret', 'a_remplir', 'pret', 'jour_j'])
    expect(r).toMatchObject({ prets: 2, aRemplir: 1, premierARemplir: '2026-10-17' })
  })

  it('un mot programmé le jour J ne compte pas en plus : le J reste le J', () => {
    const r = friseRetrouvailles(cal([mot('2026-10-17')]), '2026-10-17')
    expect(r.frise.map((j) => j.etat)).toEqual(['passe', 'a_remplir', 'jour_j'])
  })
})
