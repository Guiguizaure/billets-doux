import { describe, expect, it } from 'vitest'

import { compteARebours } from '../affichage'
import { Repondre } from './reception'

describe('réponses', () => {
  it('un mot court de 140 signes au plus', () => {
    expect(Repondre.safeParse({ texte: 'a'.repeat(140) }).success).toBe(true)
    expect(Repondre.safeParse({ texte: 'a'.repeat(141) }).success).toBe(false)
    expect(Repondre.safeParse({ texte: '   ' }).success).toBe(false)
  })
  it('ou un vocal', () => {
    expect(Repondre.safeParse({ vocal: 'abc' }).success).toBe(true)
  })
})

describe('compte à rebours', () => {
  it('aujourd’hui, demain, dans n jours (forme courte pour les cases)', () => {
    expect(compteARebours(0)).toBe('aujourd’hui')
    expect(compteARebours(1)).toBe('demain')
    expect(compteARebours(4)).toBe('dans 4 jours')
    expect(compteARebours(3, true)).toBe('dans 3 j')
  })
})
