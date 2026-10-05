import { randomUUID } from 'node:crypto'

import { createLocalReq, getPayload, type Payload } from 'payload'

import config from '@/payload.config'
import { inscrire } from '@/services/comptes'

export async function demarrer() {
  const payload = await getPayload({ config: await config })
  return payload
}

/** Vide les collections de l'appli (base de test uniquement, cf. vitest.setup.ts). */
export async function viderBase(payload: Payload) {
  await payload.db.deleteMany({ collection: 'duos', where: {} })
  await payload.db.deleteMany({ collection: 'users', where: {} })
}

export const MOT_DE_PASSE = 'mot-de-passe-test'

/** Inscrit un utilisateur et renvoie son identifiant, son e-mail et son jeton. */
export async function nouvelUtilisateur(payload: Payload, prenom: string) {
  const email = `${prenom.toLowerCase()}-${randomUUID().slice(0, 8)}@exemple.fr`
  const session = await inscrire(payload, {
    prenom,
    email,
    motDePasse: MOT_DE_PASSE,
    fuseauHoraire: 'Europe/Paris',
  })
  const { docs } = await payload.find({ collection: 'users', where: { email: { equals: email } } })
  const user = docs[0]
  if (!user) throw new Error('Utilisateur introuvable après inscription')
  return { id: user.id, email, session }
}

/** Une requête locale neuve (chaque appel de service a la sienne, comme en HTTP). */
export const requete = (payload: Payload) => createLocalReq({}, payload)
