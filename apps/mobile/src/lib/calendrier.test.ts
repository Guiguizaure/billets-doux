import type { CalendrierAuteur, MotProgramme } from '@billets-doux/shared'
import { describe, expect, it } from 'vitest'

import { construireCases, resumer } from './calendrier'

const base = {
  type: 'mot' as const,
  titre: null,
  texte: 'coucou',
  indice: null,
  manuscrit: true,
  photo: null,
  vocal: null,
  creeLe: '2026-10-10T10:00:00Z',
  modifieLe: '2026-10-10T10:00:00Z',
}

const mot = (
  id: string,
  programmation: MotProgramme['programmation'],
  ouvertLe: string | null = null,
) =>
  ({
    ...base,
    id,
    mode: programmation.mode,
    statut: ouvertLe ? 'ouvert' : 'programme',
    programmation,
    ouvertLe,
  }) as MotProgramme

const date = (jour: string) => ({ mode: 'date' as const, jour, unlockAt: `${jour}T06:00:00.000Z` })

// Jeudi 15 octobre 2026, Lina découvre ses mots à 8 h ; l'heure est passée.
const calendrier = (mots: MotProgramme[]): CalendrierAuteur => ({
  rythme: 'jour',
  destinataire: { prenom: 'Lina', heureDecouverte: '08:00', fuseauHoraire: 'Europe/Paris' },
  aujourdhui: '2026-10-15',
  premierJour: '2026-10-16',
  dernierJour: '2027-10-15',
  mots,
  brouillons: 4,
})

describe('cases du calendrier de l’auteur', () => {
  const cal = calendrier([
    mot('a', date('2026-10-15'), '2026-10-15T06:02:00.000Z'),
    mot('b', date('2026-10-16')),
    mot('c', date('2026-10-18')),
    mot('d', date('2026-10-18')),
    mot('h', { mode: 'semaine_hasard', debut: '2026-10-16', fin: '2026-10-22' }),
    mot('o', { mode: 'ouvre_quand', titre: '… je te manque' }),
  ])

  it('rythme « jour » : 14 cases depuis aujourd’hui, comme le Figma', () => {
    const cases = construireCases(cal)
    expect(cases).toHaveLength(14)
    expect(cases.slice(0, 4).map((c) => [c.titre, c.chiffre, c.etat, c.info])).toEqual([
      ['jeu.', '15', 'ouverte', 'lu à 8 h'],
      ['ven.', '16', 'prete', 'prête'],
      ['sam.', '17', 'libre', 'libre'],
      ['dim.', '18', 'prete', '2 prêts'],
    ])
    expect(cases[2]?.jourCible).toBe('2026-10-17')
  })

  it('case lue : la réponse, puis le joker, passent avant l’heure ; la réaction remplace l’icône', () => {
    const lu = (extra: Partial<MotProgramme>) =>
      construireCases(
        calendrier([{ ...mot('a', date('2026-10-15'), '2026-10-15T06:02:00.000Z'), ...extra }]),
      )[0]
    const reponse = { reaction: 'lune' as const, texte: null, vocal: null, envoyeeLe: null }
    expect(lu({ reponse })).toMatchObject({ info: 'lu à 8 h', reaction: 'lune' })
    expect(lu({ ouvertAvecJoker: true })).toMatchObject({ info: 'joker', reaction: null })
    expect(lu({ ouvertAvecJoker: true, reponse: { ...reponse, texte: 'Merci' } })?.info).toBe(
      'répondu',
    )
    expect(lu({ reponse })?.libelleAccessible).toBe(
      'jeudi 15 octobre, lu à 8 h, réaction : lune, touche pour relire',
    )
  })

  it('aujourd’hui sans mot et heure passée : case « passée », impossible d’y écrire', () => {
    const vide = construireCases(calendrier([]))
    expect(vide[0]).toMatchObject({ etat: 'passee', jourCible: null })
    expect(vide[1]).toMatchObject({ etat: 'libre', jourCible: '2026-10-16' })
  })

  it('les mots « Dans la semaine » et « Ouvre quand » ne sont jamais placés dans une case', () => {
    const ids = construireCases(cal).flatMap((c) => c.mots.map((m) => m.id))
    expect(ids).not.toContain('h')
    expect(ids).not.toContain('o')
  })

  it('rythme « semaine » : 8 cases à partir du lundi de cette semaine', () => {
    const cases = construireCases(cal, 'semaine')
    expect(cases).toHaveLength(8)
    expect(cases[0]).toMatchObject({
      debut: '2026-10-12',
      fin: '2026-10-18',
      chiffre: '12',
      etat: 'prete',
      info: '3 prêts',
    })
    expect(cases[0]?.jourCible).toBe('2026-10-16')
  })

  it('rythme « mois » : 6 mois, d’octobre à mars', () => {
    const cases = construireCases(cal, 'mois')
    expect(cases.map((c) => c.chiffre)).toEqual(['oct.', 'nov.', 'déc.', 'janv.', 'févr.', 'mars'])
    expect(cases[2]).toMatchObject({ debut: '2026-12-01', fin: '2026-12-31' })
    expect(cases[3]?.titre).toBe('2027')
  })
})

describe('résumé du haut de l’écran', () => {
  it('mots prêts, dernier jour, semaine prochaine, « Dans la semaine », lettres', () => {
    const r = resumer(
      calendrier([
        mot('a', date('2026-10-15'), '2026-10-15T06:00:00.000Z'),
        mot('b', date('2026-10-16')),
        mot('c', date('2026-10-20')),
        mot('d', date('2026-10-24')),
        mot('h', { mode: 'semaine_hasard', debut: '2026-10-16', fin: '2026-10-22' }),
        mot('o', { mode: 'ouvre_quand', titre: '… je te manque' }),
      ]),
    )
    expect(r).toMatchObject({
      prets: 4,
      jusquAu: '2026-10-24',
      semaineProchaine: 2,
      dansLaSemaine: [{ debut: '2026-10-16', fin: '2026-10-22', nombre: 1 }],
      lettres: 1,
    })
    expect(r.progression).toBeCloseTo(4 / 10)
  })
})
