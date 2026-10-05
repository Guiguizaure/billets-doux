import { estOuvrable } from '@billets-doux/shared'
import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { mettreAJour } from '@/services/comptes'
import { creerBrouillon, modifierBrouillon, reserve, supprimerBrouillon } from '@/services/mots'
import { calendrier, changerRythme, programmer, remettreEnReserve } from '@/services/programmation'

import { demarrer, duoForme, requete, viderBase } from './helpers'

let payload: Payload

// Jeudi 15 octobre 2026, 12 h à Paris (10 h UTC). Léo (destinataire) découvre ses mots à 8 h.
const MAINTENANT = new Date('2026-10-15T10:00:00Z')

beforeAll(async () => {
  payload = await demarrer()
  await viderBase(payload)
})

afterAll(async () => {
  await payload.destroy()
})

const texte = (t: string) => ({
  type: 'mot' as const,
  titre: null,
  texte: t,
  indice: null,
  manuscrit: true,
  photo: null,
  vocal: null,
})

async function preparer() {
  const { a: lina, b: leo } = await duoForme(payload)
  const mot = await creerBrouillon(await requete(payload), lina.id, texte('Il pleut sur la ville'))
  return { lina, leo, mot }
}

const enBase = (id: string) => payload.findByID({ collection: 'mots', id, depth: 0 })

describe('programmer un jour précis', () => {
  it('s’ouvre ce jour-là à l’heure du destinataire, dans son fuseau', async () => {
    const { lina, mot } = await preparer()
    const programme = await programmer(
      await requete(payload),
      lina.id,
      mot.id,
      { mode: 'date', jour: '2026-10-20' },
      MAINTENANT,
    )
    expect(programme.statut).toBe('programme')
    expect(programme.programmation).toEqual({
      mode: 'date',
      jour: '2026-10-20',
      unlockAt: '2026-10-20T06:00:00.000Z',
    })
    // Il quitte la réserve et rejoint le calendrier.
    expect((await reserve(await requete(payload), lina.id)).mots).toHaveLength(0)
    const cal = await calendrier(await requete(payload), lina.id, MAINTENANT)
    expect(cal.mots.map((m) => m.id)).toEqual([mot.id])
    expect(cal).toMatchObject({
      aujourdhui: '2026-10-15',
      premierJour: '2026-10-16',
      brouillons: 0,
    })
  })

  it('suit le fuseau du destinataire, pas celui de l’auteur', async () => {
    const { lina, leo, mot } = await preparer()
    await payload.update({
      collection: 'users',
      id: leo.id,
      data: { fuseauHoraire: 'America/New_York' },
    })
    const programme = await programmer(
      await requete(payload),
      lina.id,
      mot.id,
      { mode: 'date', jour: '2026-10-20' },
      MAINTENANT,
    )
    expect(programme.programmation).toMatchObject({ unlockAt: '2026-10-20T12:00:00.000Z' })
  })

  it('refuse un jour passé, aujourd’hui si l’heure est passée, et au-delà d’un an (400)', async () => {
    const { lina, mot } = await preparer()
    for (const jour of ['2026-10-14', '2026-10-15', '2027-10-16']) {
      await expect(
        programmer(await requete(payload), lina.id, mot.id, { mode: 'date', jour }, MAINTENANT),
      ).rejects.toMatchObject({ statut: 400 })
    }
  })

  it('accepte aujourd’hui si l’heure du destinataire n’est pas encore passée', async () => {
    const { lina, leo, mot } = await preparer()
    await mettreAJour(await requete(payload), leo.id, { heureDecouverte: '21:00' })
    const programme = await programmer(
      await requete(payload),
      lina.id,
      mot.id,
      { mode: 'date', jour: '2026-10-15' },
      MAINTENANT,
    )
    expect(programme.programmation).toMatchObject({ unlockAt: '2026-10-15T19:00:00.000Z' })
  })
})

describe('« Dans la semaine »', () => {
  it('le serveur tire un jour dans les 7 jours à partir de demain, sans jamais le révéler à l’auteur', async () => {
    const { lina, mot } = await preparer()
    const programme = await programmer(
      await requete(payload),
      lina.id,
      mot.id,
      { mode: 'semaine_hasard' },
      MAINTENANT,
    )
    expect(programme.programmation).toEqual({
      mode: 'semaine_hasard',
      debut: '2026-10-16',
      fin: '2026-10-22',
    })
    const secret = await enBase(mot.id)
    expect(secret.jourOuverture! >= '2026-10-16' && secret.jourOuverture! <= '2026-10-22').toBe(
      true,
    )

    // Ni la réponse ni le calendrier ne contiennent le jour tiré ou l'instant d'ouverture.
    const cal = await calendrier(await requete(payload), lina.id, MAINTENANT)
    for (const vue of [JSON.stringify(programme), JSON.stringify(cal)]) {
      expect(vue).not.toContain(secret.unlockAt!)
      expect(vue).not.toContain(`"${secret.jourOuverture}"`)
      expect(vue).not.toContain('unlockAt":"2026')
    }
  })
})

describe('« Ouvre quand… »', () => {
  it('une lettre sans date, avec son titre', async () => {
    const { lina, mot } = await preparer()
    const programme = await programmer(
      await requete(payload),
      lina.id,
      mot.id,
      { mode: 'ouvre_quand', titre: '… tu n’arrives pas à dormir' },
      MAINTENANT,
    )
    expect(programme.programmation).toEqual({
      mode: 'ouvre_quand',
      titre: '… tu n’arrives pas à dormir',
    })
    expect((await enBase(mot.id)).unlockAt ?? null).toBeNull()
  })
})

describe('changement d’heure ou de fuseau du destinataire', () => {
  it('les mots programmés suivent sa nouvelle heure de découverte', async () => {
    const { lina, leo, mot } = await preparer()
    await programmer(
      await requete(payload),
      lina.id,
      mot.id,
      { mode: 'date', jour: '2026-10-20' },
      MAINTENANT,
    )
    await mettreAJour(await requete(payload), leo.id, { heureDecouverte: '21:00' })
    expect((await enBase(mot.id)).unlockAt).toBe('2026-10-20T19:00:00.000Z')
  })

  it('cas limite : l’heure avancée est déjà passée aujourd’hui → le mot s’ouvre tout de suite, sans glisser au lendemain', async () => {
    const { lina, leo, mot } = await preparer()
    // Programmé pour aujourd'hui 21 h (pas encore passé à 12 h)…
    await mettreAJour(await requete(payload), leo.id, { heureDecouverte: '21:00' })
    await programmer(
      await requete(payload),
      lina.id,
      mot.id,
      { mode: 'date', jour: '2026-10-15' },
      MAINTENANT,
    )
    // … puis Léo avance son heure à 8 h, déjà passée.
    await mettreAJour(await requete(payload), leo.id, { heureDecouverte: '08:00' })
    const apres = await enBase(mot.id)
    expect(apres.jourOuverture).toBe('2026-10-15')
    expect(apres.unlockAt).toBe('2026-10-15T06:00:00.000Z')
    expect(apres.statut).toBe('programme')
    expect(estOuvrable(apres.unlockAt, MAINTENANT)).toBe(true)
  })

  it('un mot « Dans la semaine » garde son jour secret et suit le nouveau fuseau', async () => {
    const { lina, leo, mot } = await preparer()
    await programmer(
      await requete(payload),
      lina.id,
      mot.id,
      { mode: 'semaine_hasard' },
      MAINTENANT,
    )
    const avant = await enBase(mot.id)
    await payload.update({ collection: 'users', id: leo.id, data: { fuseauHoraire: 'Asia/Tokyo' } })
    const apres = await enBase(mot.id)
    expect(apres.jourOuverture).toBe(avant.jourOuverture)
    expect(apres.unlockAt).toBe(new Date(`${avant.jourOuverture}T08:00:00+09:00`).toISOString())
  })
})

describe('après la programmation', () => {
  it('le mot reste modifiable et peut revenir dans la réserve', async () => {
    const { lina, mot } = await preparer()
    await programmer(
      await requete(payload),
      lina.id,
      mot.id,
      { mode: 'date', jour: '2026-10-20' },
      MAINTENANT,
    )
    const modifie = await modifierBrouillon(await requete(payload), lina.id, mot.id, {
      texte: 'Il pleut encore',
    })
    expect(modifie).toMatchObject({ texte: 'Il pleut encore', statut: 'programme' })

    const remis = await remettreEnReserve(await requete(payload), lina.id, mot.id)
    expect(remis).toMatchObject({ statut: 'brouillon', mode: 'brouillon' })
    const apres = await enBase(mot.id)
    expect([apres.unlockAt ?? null, apres.jourOuverture ?? null]).toEqual([null, null])
    expect((await reserve(await requete(payload), lina.id)).mots.map((m) => m.id)).toEqual([mot.id])
  })

  it('un mot ouvert ne bouge plus (409)', async () => {
    const { lina, mot } = await preparer()
    await programmer(
      await requete(payload),
      lina.id,
      mot.id,
      { mode: 'date', jour: '2026-10-20' },
      MAINTENANT,
    )
    await payload.update({ collection: 'mots', id: mot.id, data: { statut: 'ouvert' } })
    for (const action of [
      () =>
        programmer(requeteSync, lina.id, mot.id, { mode: 'date', jour: '2026-10-21' }, MAINTENANT),
      () => modifierBrouillon(requeteSync, lina.id, mot.id, { texte: 'x' }),
      () => remettreEnReserve(requeteSync, lina.id, mot.id),
      () => supprimerBrouillon(requeteSync, lina.id, mot.id),
    ]) {
      requeteSync = await requete(payload)
      await expect(action()).rejects.toMatchObject({ statut: 409 })
    }
  })

  it('personne d’autre ne programme mon mot (404), et chacun ne voit que son calendrier', async () => {
    const { lina, leo, mot } = await preparer()
    await expect(
      programmer(
        await requete(payload),
        leo.id,
        mot.id,
        { mode: 'date', jour: '2026-10-20' },
        MAINTENANT,
      ),
    ).rejects.toMatchObject({ statut: 404 })
    await programmer(
      await requete(payload),
      lina.id,
      mot.id,
      { mode: 'date', jour: '2026-10-20' },
      MAINTENANT,
    )
    expect((await calendrier(await requete(payload), leo.id, MAINTENANT)).mots).toHaveLength(0)
  })
})

describe('rythme du calendrier', () => {
  it('chaque auteur a le sien', async () => {
    const { lina, leo } = await preparer()
    await changerRythme(await requete(payload), lina.id, 'semaine')
    expect((await calendrier(await requete(payload), lina.id, MAINTENANT)).rythme).toBe('semaine')
    expect((await calendrier(await requete(payload), leo.id, MAINTENANT)).rythme).toBe('jour')
  })
})

let requeteSync: Awaited<ReturnType<typeof requete>>
