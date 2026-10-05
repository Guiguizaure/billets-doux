import { describe, expect, it, vi } from 'vitest'

import { creerClient } from './client'
import { ErreurApi, MESSAGE_RESEAU } from './erreurs'

const reponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

describe('client d’API', () => {
  it('envoie le jeton et le corps JSON', async () => {
    const fetchImpl = vi.fn(async () => reponse(200, { jeton: 'abc', expire: 1 }))
    const client = creerClient({ baseUrl: 'http://api/', jeton: () => 'xyz', fetchImpl })
    await client.connexion({ email: 'a@b.fr', motDePasse: 'secret12' })
    expect(fetchImpl).toHaveBeenCalledWith('http://api/api/comptes/connexion', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: 'JWT xyz',
      },
      body: JSON.stringify({ email: 'a@b.fr', motDePasse: 'secret12' }),
    })
  })

  it('transforme une erreur de l’API en ErreurApi avec ses champs', async () => {
    const client = creerClient({
      baseUrl: 'http://api',
      jeton: () => null,
      fetchImpl: async () => reponse(409, { erreur: 'Déjà pris', champs: { email: 'Déjà pris' } }),
    })
    const erreur = await client.connexion({ email: 'a@b.fr', motDePasse: 'x' }).catch((e) => e)
    expect(erreur).toBeInstanceOf(ErreurApi)
    expect(erreur).toMatchObject({
      message: 'Déjà pris',
      statut: 409,
      champs: { email: 'Déjà pris' },
    })
  })

  it('signale une panne réseau avec un message lisible', async () => {
    const client = creerClient({
      baseUrl: 'http://api',
      jeton: () => null,
      fetchImpl: async () => {
        throw new TypeError('Network request failed')
      },
    })
    await expect(client.moi()).rejects.toMatchObject({ message: MESSAGE_RESEAU, statut: 0 })
  })
})
