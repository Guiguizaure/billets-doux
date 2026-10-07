import type { Payload } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { decrire, preparerBucket } from '@/lib/stockage'
import { mettreAJour, vueMoi } from '@/services/comptes'
import { connexionDemo, creerDemo, DEMO } from '@/services/demo'
import { fermerDuo, souvenirs, supprimerCompte } from '@/services/duree'
import { reserve } from '@/services/mots'
import { calendrier } from '@/services/programmation'
import { calendrierDestinataire, ouvrir, reagir } from '@/services/reception'

import { demarrer, requete, viderBase } from './helpers'

let payload: Payload
const MDP = 'mot-de-passe-de-demo'

beforeAll(async () => {
  process.env.DEMO_MOT_DE_PASSE = MDP
  payload = await demarrer()
  await preparerBucket([])
})

beforeEach(async () => {
  await viderBase(payload)
})

afterAll(async () => {
  await payload.destroy()
})

async function ids() {
  const { docs } = await payload.find({
    collection: 'users',
    where: { email: { in: [DEMO.visiteur.email, DEMO.partenaire.email] } },
    depth: 0,
  })
  const leo = docs.find((u) => u.email === DEMO.visiteur.email)!
  const lina = docs.find((u) => u.email === DEMO.partenaire.email)!
  return { leo: leo.id, lina: lina.id }
}

const compter = async () => ({
  mots: (await payload.count({ collection: 'mots' })).totalDocs,
  medias: (await payload.count({ collection: 'medias' })).totalDocs,
  reponses: (await payload.count({ collection: 'reponses' })).totalDocs,
  duos: (await payload.count({ collection: 'duos' })).totalDocs,
  users: (await payload.count({ collection: 'users' })).totalDocs,
})

describe('duo de démo', () => {
  it('un duo rempli des deux côtés, et le verrouillage tient toujours', async () => {
    const maintenant = new Date()
    await creerDemo(payload, maintenant)
    const { leo } = await ids()

    const recu = await calendrierDestinataire(await requete(payload), leo, maintenant)
    expect(recu.expediteur.prenom).toBe('Lina')
    expect(recu.cases.filter((c) => c.etat === 'a_ouvrir')).toHaveLength(1)
    expect(recu.cases.filter((c) => c.etat === 'scelle')).toHaveLength(3)
    expect(recu.cases.filter((c) => c.etat === 'ouvert')).toHaveLength(4)
    expect(recu.surprises).toBe(1)
    expect(recu.lettres.map((l) => l.etat).sort()).toEqual(['ouvert', 'scelle'])
    const brut = JSON.stringify(recu)
    for (const scelle of [
      'La même, en mieux',
      'Il t’attend sur ma chaise',
      'Dans cinq jours',
      'héron',
    ]) {
      expect(brut).not.toContain(scelle)
    }

    // Le côté « Pour toi » du visiteur : programmés, ouverts avec réaction et réponse, réserve.
    const ecrits = await calendrier(await requete(payload), leo, maintenant)
    expect(ecrits.destinataire.prenom).toBe('Lina')
    expect(ecrits.mots).toHaveLength(6)
    expect(ecrits.mots.some((m) => m.reponse?.texte === 'Je l’ai mis. Il te va mieux à toi.')).toBe(
      true,
    )
    expect(ecrits.mots.some((m) => m.ouvertAvecJoker)).toBe(true)
    expect((await reserve(await requete(payload), leo)).mots).toHaveLength(2)

    // Souvenirs : les deux sens, « Ce jour-là » (la lettre ouverte il y a une semaine).
    const s = await souvenirs(await requete(payload), leo, maintenant)
    expect(s.mots).toHaveLength(7)
    expect(s.ceJourLa?.phrase).toMatch(/^Il y a une semaine, Lina t’envoyait/)
    expect(
      (await vueMoi(await requete(payload), leo, 'http://api')).duo?.retrouvailles,
    ).toBeTruthy()

    // Les photos et le vocal sont bien dans le stockage.
    const { docs: medias } = await payload.find({ collection: 'medias', depth: 0 })
    expect(medias).toHaveLength(5)
    for (const m of medias) expect(await decrire(m.cle)).not.toBeNull()
  })

  it('connexion sans mot de passe ; rien d’irréversible ; fuseau figé', async () => {
    await creerDemo(payload)
    const { leo } = await ids()
    expect((await connexionDemo(payload)).jeton).toBeTruthy()
    expect((await vueMoi(await requete(payload), leo, 'http://api')).utilisateur.demo).toBe(true)

    await expect(fermerDuo(await requete(payload), leo)).rejects.toMatchObject({ statut: 403 })
    await expect(supprimerCompte(await requete(payload), leo, MDP)).rejects.toMatchObject({
      statut: 403,
    })
    await mettreAJour(await requete(payload), leo, { fuseauHoraire: 'America/New_York' })
    expect(
      (await vueMoi(await requete(payload), leo, 'http://api')).utilisateur.fuseauHoraire,
    ).toBe('Europe/Paris')
  })

  it('la remise à zéro revient exactement au même état, sans rien laisser traîner', async () => {
    await creerDemo(payload)
    const avant = await compter()
    const { leo } = await ids()

    // Un visiteur ouvre le mot du jour, réagit, laisse un brouillon…
    const recu = await calendrierDestinataire(await requete(payload), leo)
    const duJour = recu.cases.find((c) => c.etat === 'a_ouvrir')!
    await ouvrir(await requete(payload), leo, duJour.id, { joker: false })
    await reagir(await requete(payload), leo, duJour.id, 'coeur')
    const { creerBrouillon } = await import('@/services/mots')
    await creerBrouillon(await requete(payload), leo, {
      type: 'mot',
      titre: null,
      texte: 'Laissé par un visiteur',
      indice: null,
      manuscrit: true,
      photo: null,
      vocal: null,
    })

    await creerDemo(payload)
    expect(await compter()).toEqual(avant)
    const apres = await calendrierDestinataire(await requete(payload), leo)
    expect(apres.cases.filter((c) => c.etat === 'a_ouvrir')).toHaveLength(1)
  })

  it('sans mot de passe de démo configuré, pas de démo', async () => {
    const sauvegarde = process.env.DEMO_MOT_DE_PASSE
    delete process.env.DEMO_MOT_DE_PASSE
    await expect(connexionDemo(payload)).rejects.toMatchObject({ statut: 404 })
    process.env.DEMO_MOT_DE_PASSE = sauvegarde
  })
})
