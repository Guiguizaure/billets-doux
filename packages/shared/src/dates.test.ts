import { describe, expect, it } from 'vitest'

import {
  ajouterJours,
  dernierJourProgrammable,
  ecartEnJours,
  estJourValide,
  grilleDuMois,
  instantOuverture,
  jourLocal,
  libellesJour,
  lundiDe,
  premierJourProgrammable,
  semaineAuHasard,
  tirerJourDansLaSemaine,
} from './dates'

describe('jours', () => {
  it('ajoute des jours sans être gêné par les changements d’heure', () => {
    expect(ajouterJours('2026-10-24', 1)).toBe('2026-10-25')
    expect(ajouterJours('2026-10-25', 1)).toBe('2026-10-26')
    expect(ajouterJours('2026-12-31', 1)).toBe('2027-01-01')
    expect(ajouterJours('2026-03-01', -1)).toBe('2026-02-28')
    expect(ecartEnJours('2026-10-15', '2026-10-24')).toBe(9)
  })

  it('valide le format et l’existence du jour', () => {
    expect(estJourValide('2026-10-20')).toBe(true)
    expect(estJourValide('2026-02-30')).toBe(false)
    expect(estJourValide('20/10/2026')).toBe(false)
  })

  it('le jour local dépend du fuseau', () => {
    const instant = new Date('2026-10-20T23:30:00Z')
    expect(jourLocal(instant, 'Europe/Paris')).toBe('2026-10-21')
    expect(jourLocal(instant, 'America/New_York')).toBe('2026-10-20')
  })
})

describe('instant d’ouverture : jour + heure du destinataire, dans son fuseau', () => {
  it('Paris, heure d’été puis d’hiver (changement le 25 octobre 2026)', () => {
    expect(instantOuverture('2026-10-24', '08:00', 'Europe/Paris').toISOString()).toBe(
      '2026-10-24T06:00:00.000Z',
    )
    expect(instantOuverture('2026-10-25', '08:00', 'Europe/Paris').toISOString()).toBe(
      '2026-10-25T07:00:00.000Z',
    )
  })

  it('Paris, passage à l’heure d’été (29 mars 2026)', () => {
    expect(instantOuverture('2026-03-28', '07:30', 'Europe/Paris').toISOString()).toBe(
      '2026-03-28T06:30:00.000Z',
    )
    expect(instantOuverture('2026-03-29', '07:30', 'Europe/Paris').toISOString()).toBe(
      '2026-03-29T05:30:00.000Z',
    )
  })

  it('fuseaux lointains', () => {
    expect(instantOuverture('2026-10-20', '21:00', 'Pacific/Auckland').toISOString()).toBe(
      '2026-10-20T08:00:00.000Z',
    )
    expect(instantOuverture('2026-10-20', '12:00', 'America/Los_Angeles').toISOString()).toBe(
      '2026-10-20T19:00:00.000Z',
    )
  })
})

describe('bornes de programmation', () => {
  it('aujourd’hui tant que l’heure de découverte n’est pas passée, sinon demain', () => {
    const avant = new Date('2026-10-15T05:00:00Z') // 7 h à Paris
    const apres = new Date('2026-10-15T07:00:00Z') // 9 h à Paris
    expect(premierJourProgrammable(avant, '08:00', 'Europe/Paris')).toBe('2026-10-15')
    expect(premierJourProgrammable(apres, '08:00', 'Europe/Paris')).toBe('2026-10-16')
    expect(dernierJourProgrammable(avant, 'Europe/Paris')).toBe('2027-10-15')
  })
})

describe('« Dans la semaine »', () => {
  const maintenant = new Date('2026-10-15T10:00:00Z')
  it('fenêtre de demain à demain + 6, chez le destinataire', () => {
    expect(semaineAuHasard(maintenant, 'Europe/Paris')).toEqual({
      debut: '2026-10-16',
      fin: '2026-10-22',
    })
  })
  it('le tirage reste dans la fenêtre, bornes comprises', () => {
    expect(tirerJourDansLaSemaine(maintenant, 'Europe/Paris', () => 0)).toBe('2026-10-16')
    expect(tirerJourDansLaSemaine(maintenant, 'Europe/Paris', () => 0.9999)).toBe('2026-10-22')
    for (let i = 0; i < 200; i++) {
      const jour = tirerJourDansLaSemaine(maintenant, 'Europe/Paris')
      expect(jour >= '2026-10-16' && jour <= '2026-10-22').toBe(true)
    }
  })
})

describe('affichage', () => {
  it('libellés français', () => {
    expect(libellesJour('2026-10-20')).toMatchObject({
      court: 'mardi 20',
      long: 'mardi 20 octobre',
      nomJourCourt: 'mar.',
      nomMoisCourt: 'oct.',
    })
  })
  it('grille d’octobre 2026 : commence un jeudi, semaines du lundi au dimanche', () => {
    const grille = grilleDuMois(2026, 10)
    expect(grille[0]).toEqual([
      null,
      null,
      null,
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
      '2026-10-04',
    ])
    expect(grille.at(-1)).toEqual([
      '2026-10-26',
      '2026-10-27',
      '2026-10-28',
      '2026-10-29',
      '2026-10-30',
      '2026-10-31',
      null,
    ])
    expect(lundiDe('2026-10-25')).toBe('2026-10-19')
  })
})
