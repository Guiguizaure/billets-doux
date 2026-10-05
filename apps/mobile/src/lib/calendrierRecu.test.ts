import type { CalendrierDestinataire, CaseRecue } from '@billets-doux/shared'
import { describe, expect, it } from 'vitest'

import {
  construireCasesRecues,
  ligneSurprises,
  periodeParDefaut,
  periodesRecues,
  resumerRecu,
  titresLecture,
} from './calendrierRecu'

const kase = (id: string, jour: string, etat: CaseRecue['etat'], type: CaseRecue['type'] = 'mot') =>
  ({
    id,
    jour,
    unlockAt: `${jour}T06:00:00.000Z`,
    type,
    etat,
    indice: null,
    ouvertLe: etat === 'ouvert' ? `${jour}T06:02:00.000Z` : null,
    ouvertAvecJoker: false,
    reaction: null,
  }) satisfies CaseRecue

// Jeudi 15 octobre 2026, comme dans le Figma.
const calendrier = (cases: CaseRecue[], surprises = 0): CalendrierDestinataire => ({
  expediteur: { prenom: 'Lina' },
  aujourdhui: '2026-10-15',
  jokersRestants: 1,
  cases,
  surprises,
  lettres: [],
})

describe('calendrier du destinataire', () => {
  const cal = calendrier([
    kase('a', '2026-10-13', 'ouvert'),
    kase('b', '2026-10-15', 'a_ouvrir', 'photo'),
    kase('c', '2026-10-16', 'scelle', 'vocal'),
    kase('d', '2026-10-19', 'scelle'),
    kase('e', '2027-01-04', 'scelle'),
  ])

  it('puces : cette semaine, le mois en cours, puis jusqu’au mois de la dernière case', () => {
    const periodes = periodesRecues(cal)
    expect(periodes.map((p) => p.libelle)).toEqual([
      'Cette semaine',
      'Octobre',
      'Novembre',
      'Décembre',
      'Janvier',
    ])
    expect(periodes[0]).toMatchObject({ debut: '2026-10-12', fin: '2026-10-18' })
    expect(periodeParDefaut(periodes)?.libelle).toBe('Octobre')
    // Sans case lointaine : le mois en cours et le suivant.
    expect(periodesRecues(calendrier([])).map((p) => p.libelle)).toEqual([
      'Cette semaine',
      'Octobre',
      'Novembre',
    ])
  })

  it('cases d’un mois : lu, à ouvrir, compte à rebours, vide', () => {
    const octobre = periodesRecues(cal)[1]!
    const cases = construireCasesRecues(cal, octobre)
    expect(cases).toHaveLength(31)
    const parJour = (j: string) => cases.find((c) => c.jour === j)
    expect(parJour('2026-10-13')).toMatchObject({ etat: 'lu', info: 'lu', titre: 'mar.' })
    expect(parJour('2026-10-15')).toMatchObject({ etat: 'a_ouvrir', info: 'à ouvrir' })
    expect(parJour('2026-10-16')).toMatchObject({ etat: 'scelle', info: 'demain' })
    expect(parJour('2026-10-19')).toMatchObject({ etat: 'scelle', info: 'dans 4 j' })
    expect(parJour('2026-10-17')).toMatchObject({ etat: 'vide', info: 'vide' })
    expect(parJour('2026-10-19')?.libelleAccessible).toBe(
      'Lundi 19 octobre, mot, scellé, dans 4 jours',
    )
  })

  it('résumé : cases préparées (surprises comprises) et mots à ouvrir dans l’ordre', () => {
    expect(resumerRecu(calendrier([kase('c', '2026-10-16', 'scelle')], 2)).ligne).toBe(
      '3 cases préparées · la prochaine s’ouvre demain',
    )
    const r = resumerRecu(cal)
    expect(r.ligne).toBe('4 cases préparées · 1 à ouvrir aujourd’hui')
    expect(r.aOuvrir).toEqual(['b'])
    expect(resumerRecu(calendrier([])).ligne).toBe('Rien de prévu pour l’instant.')
  })

  it('surprises : le nombre, jamais le jour', () => {
    expect(ligneSurprises(0)).toBeNull()
    expect(ligneSurprises(1)).toBe('Une surprise t’attend quelque part cette semaine')
    expect(ligneSurprises(3)).toBe('3 surprises t’attendent quelque part cette semaine')
  })

  it('titres de lecture générés', () => {
    expect(titresLecture('2026-10-15')).toEqual({ enTete: 'Mot du jeudi', jourNom: 'jeudi' })
    expect(titresLecture(null).enTete).toBe('Ouvre quand…')
  })
})
