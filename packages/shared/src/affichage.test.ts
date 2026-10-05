import { describe, expect, it } from 'vitest'

import { formaterDuree, quandNote } from './affichage'

describe('formaterDuree', () => {
  it('écrit minutes et secondes', () => {
    expect(formaterDuree(32)).toBe('0:32')
    expect(formaterDuree(125)).toBe('2:05')
    expect(formaterDuree(180)).toBe('3:00')
    expect(formaterDuree(0.4)).toBe('0:00')
  })
})

describe('quandNote', () => {
  const lundi20h = new Date(2026, 9, 12, 20, 0) // lundi 12 octobre 2026
  it('aujourd’hui, hier, puis le jour de la semaine', () => {
    expect(quandNote(new Date(2026, 9, 12, 8, 0).toISOString(), lundi20h)).toBe('aujourd’hui')
    expect(quandNote(new Date(2026, 9, 11, 23, 0).toISOString(), lundi20h)).toBe('hier')
    expect(quandNote(new Date(2026, 9, 8, 9, 0).toISOString(), lundi20h)).toBe('jeudi')
  })
  it('au-delà d’une semaine, la date', () => {
    expect(quandNote(new Date(2026, 9, 3, 9, 0).toISOString(), lundi20h)).toBe('le 3 octobre')
  })
})
