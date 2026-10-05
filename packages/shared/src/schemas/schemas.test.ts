import { describe, expect, it } from 'vitest'

import { Inscription } from './comptes'
import { formaterCode, normaliserCode, RejoindreDuo } from './duo'
import { formaterHeure, HeureDecouverte } from './heure'

describe('codes d’invitation', () => {
  it('normalise la saisie (casse, accents, espaces, point médian)', () => {
    expect(normaliserCode(' lune · 4821 ')).toBe('LUNE4821')
    expect(normaliserCode('Étoile-0042')).toBe('ETOILE0042')
  })

  it('formate pour l’affichage', () => {
    expect(formaterCode('LUNE4821')).toBe('LUNE · 4821')
  })

  it('valide le format après normalisation', () => {
    expect(RejoindreDuo.parse({ code: 'plume 1234' })).toEqual({ code: 'PLUME1234' })
    expect(RejoindreDuo.safeParse({ code: '1234' }).success).toBe(false)
    expect(RejoindreDuo.safeParse({ code: 'LUNE12' }).success).toBe(false)
  })
})

describe('heures de découverte', () => {
  it('accepte HH:MM sur 24 h', () => {
    expect(HeureDecouverte.safeParse('07:30').success).toBe(true)
    expect(HeureDecouverte.safeParse('24:00').success).toBe(false)
    expect(HeureDecouverte.safeParse('7:30').success).toBe(false)
  })

  it('formate à la française', () => {
    expect(formaterHeure('07:30')).toBe('7 h 30')
    expect(formaterHeure('08:00')).toBe('8 h')
    expect(formaterHeure('21:00')).toBe('21 h')
  })
})

describe('inscription', () => {
  it('nettoie l’e-mail et le prénom', () => {
    const r = Inscription.parse({
      prenom: '  Lina ',
      email: ' Lina@Exemple.FR ',
      motDePasse: '12345678',
      fuseauHoraire: 'Europe/Paris',
    })
    expect(r.prenom).toBe('Lina')
    expect(r.email).toBe('lina@exemple.fr')
  })

  it('refuse un mot de passe trop court, avec un message en français', () => {
    const r = Inscription.safeParse({
      prenom: 'Léo',
      email: 'leo@exemple.fr',
      motDePasse: 'court',
      fuseauHoraire: 'Europe/Paris',
    })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0]?.message).toMatch(/au moins 8 caractères/)
  })
})
