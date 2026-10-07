import { createLocalReq, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { connecter, inscrire, mettreAJour, rafraichir, vueMoi } from '@/services/comptes'

import { demarrer, MOT_DE_PASSE, nouvelUtilisateur, requete, viderBase } from './helpers'

let payload: Payload

beforeAll(async () => {
  payload = await demarrer()
  await viderBase(payload)
})

afterAll(async () => {
  await payload.destroy()
})

describe('inscription et connexion', () => {
  it('crée le compte avec l’heure par défaut et renvoie un jeton', async () => {
    const lina = await nouvelUtilisateur(payload, 'Lina')
    expect(lina.session.jeton).toBeTruthy()
    expect(lina.session.expire).toBeGreaterThan(Date.now() / 1000)

    const moi = await vueMoi(await requete(payload), lina.id, 'http://api')
    expect(moi.utilisateur).toMatchObject({
      prenom: 'Lina',
      heureDecouverte: '08:00',
      heureConfirmee: false,
      fuseauHoraire: 'Europe/Paris',
    })
    expect(moi.duo).toBeNull()
  })

  it('refuse une adresse déjà utilisée (409)', async () => {
    const leo = await nouvelUtilisateur(payload, 'Leo')
    await expect(
      inscrire(payload, {
        prenom: 'Léo bis',
        email: leo.email,
        motDePasse: MOT_DE_PASSE,
        fuseauHoraire: 'Europe/Paris',
        majeur: true,
      }),
    ).rejects.toMatchObject({ statut: 409, champs: { email: expect.any(String) } })
  })

  it('refuse un fuseau horaire inconnu (400)', async () => {
    await expect(
      inscrire(payload, {
        prenom: 'Zoé',
        email: 'zoe-fuseau@exemple.fr',
        motDePasse: MOT_DE_PASSE,
        fuseauHoraire: 'Mars/Olympus',
        majeur: true,
      }),
    ).rejects.toMatchObject({ statut: 400 })
  })

  it('refuse un mauvais mot de passe (401) ; après 5 échecs, même le bon est bloqué (423)', async () => {
    const sam = await nouvelUtilisateur(payload, 'Sam')
    for (let i = 0; i < 5; i++) {
      await expect(
        connecter(payload, { email: sam.email, motDePasse: 'mauvais' }),
      ).rejects.toMatchObject({ statut: 401 })
    }
    await expect(
      connecter(payload, { email: sam.email, motDePasse: MOT_DE_PASSE }),
    ).rejects.toMatchObject({ statut: 423 })
  })

  it('confirme l’heure de découverte choisie', async () => {
    const mia = await nouvelUtilisateur(payload, 'Mia')
    await mettreAJour(await requete(payload), mia.id, { heureDecouverte: '21:00' })
    const moi = await vueMoi(await requete(payload), mia.id, 'http://api')
    expect(moi.utilisateur).toMatchObject({ heureDecouverte: '21:00', heureConfirmee: true })
  })
})

describe('accès direct aux collections', () => {
  it('un utilisateur de l’appli ne lit ni les comptes ni les duos par l’API générique', async () => {
    const tom = await nouvelUtilisateur(payload, 'Tom')
    const user = {
      ...(await payload.findByID({ collection: 'users', id: tom.id })),
      collection: 'users' as const,
    }
    await expect(
      payload.find({ collection: 'users', overrideAccess: false, user }),
    ).rejects.toThrow()
    await expect(
      payload.find({ collection: 'duos', overrideAccess: false, user }),
    ).rejects.toThrow()
    await expect(
      payload.update({
        collection: 'users',
        id: tom.id,
        data: { prenom: 'X' },
        overrideAccess: false,
        user,
      }),
    ).rejects.toThrow()
  })
})

describe('tutoriel', () => {
  it('les cartes et chaque bulle d’onglet ne reviennent pas une fois vues ; « Revoir » efface tout', async () => {
    const { id } = await nouvelUtilisateur(payload, 'Camille')
    const tutoriel = async () =>
      (await vueMoi(await requete(payload), id, 'http://api')).utilisateur.tutoriel
    expect(await tutoriel()).toEqual({ cartesVues: false, bullesVues: [] })

    await mettreAJour(await requete(payload), id, { tutoriel: { cartesVues: true } })
    await mettreAJour(await requete(payload), id, { tutoriel: { bulleVue: 'pourMoi' } })
    await mettreAJour(await requete(payload), id, { tutoriel: { bulleVue: 'pourMoi' } })
    await mettreAJour(await requete(payload), id, { tutoriel: { bulleVue: 'souvenirs' } })
    expect(await tutoriel()).toEqual({ cartesVues: true, bullesVues: ['pourMoi', 'souvenirs'] })

    await mettreAJour(await requete(payload), id, { tutoriel: { revoir: true } })
    expect(await tutoriel()).toEqual({ cartesVues: false, bullesVues: [] })

    // « Passer » sur une bulle : plus aucune bulle.
    await mettreAJour(await requete(payload), id, { tutoriel: { passer: true } })
    expect(await tutoriel()).toEqual({
      cartesVues: true,
      bullesVues: ['pourMoi', 'pourToi', 'souvenirs', 'nousDeux'],
    })
  })
})

describe('rafraîchissement', () => {
  /** Une requête authentifiée par le jeton, comme une vraie requête HTTP. */
  const requeteAvecJeton = async (jeton: string) => {
    const headers = new Headers({ Authorization: `JWT ${jeton}` })
    const { user } = await payload.auth({ headers })
    if (!user) throw new Error('Jeton refusé')
    const req = await createLocalReq({ user }, payload)
    return Object.assign(req, { headers, url: 'http://api/api/comptes/rafraichir' })
  }

  it('deux rafraîchissements simultanés de la même session réussissent tous les deux', async () => {
    const { session } = await nouvelUtilisateur(payload, 'Camille')
    const [a, b] = await Promise.all([
      rafraichir(await requeteAvecJeton(session.jeton)),
      rafraichir(await requeteAvecJeton(session.jeton)),
    ])
    expect(a.jeton).toBeTruthy()
    expect(b.jeton).toBeTruthy()
    // Les deux jetons restent valables.
    await expect(requeteAvecJeton(a.jeton)).resolves.toBeTruthy()
    await expect(requeteAvecJeton(b.jeton)).resolves.toBeTruthy()
  })
})
