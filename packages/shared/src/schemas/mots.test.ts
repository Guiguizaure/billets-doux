import { describe, expect, it } from 'vitest'

import { DemandeTeleversement, ModificationBrouillon, NouveauBrouillon } from './mots'

describe('brouillons', () => {
  it('refuse un mot vide (ni texte, ni photo, ni vocal)', () => {
    expect(NouveauBrouillon.safeParse({ type: 'mot', texte: '   ' }).success).toBe(false)
    expect(NouveauBrouillon.safeParse({ type: 'photo', photo: 'abc' }).success).toBe(true)
  })

  it('complète les champs absents avec des valeurs par défaut', () => {
    expect(NouveauBrouillon.parse({ type: 'poeme', texte: 'Il pleut' })).toMatchObject({
      titre: null,
      indice: null,
      manuscrit: true,
      photo: null,
      vocal: null,
    })
  })

  it('limite la longueur du texte et de l’indice', () => {
    expect(ModificationBrouillon.safeParse({ texte: 'a'.repeat(2001) }).success).toBe(false)
    expect(ModificationBrouillon.safeParse({ indice: 'a'.repeat(81) }).success).toBe(false)
  })
})

describe('demandes de téléversement', () => {
  it('accepte une photo JPEG de moins de 5 Mo', () => {
    expect(
      DemandeTeleversement.safeParse({ nature: 'photo', mime: 'image/jpeg', taille: 800_000 })
        .success,
    ).toBe(true)
  })

  it('refuse un autre format, une photo trop lourde ou un vocal trop long', () => {
    expect(
      DemandeTeleversement.safeParse({ nature: 'photo', mime: 'image/png', taille: 10 }).success,
    ).toBe(false)
    expect(
      DemandeTeleversement.safeParse({ nature: 'photo', mime: 'image/jpeg', taille: 6e6 }).success,
    ).toBe(false)
    expect(
      DemandeTeleversement.safeParse({
        nature: 'vocal',
        mime: 'audio/mp4',
        taille: 1e6,
        duree: 240,
      }).success,
    ).toBe(false)
  })
})
