import { beforeEach, describe, expect, it, vi } from 'vitest'

// Ni React Native ni Expo dans ces tests : le client et le stockage sont simulés.
const etat = vi.hoisted(() => ({
  memoire: 'ancien' as string | null,
  disque: 'ancien' as string | null,
  n: 0,
}))
const rafraichir = vi.hoisted(() => vi.fn())
vi.mock('react-native', () => ({ Platform: { OS: 'android' } }))
vi.mock('./client', () => ({
  api: { rafraichir },
  jeton: { lire: () => etat.memoire, definir: (j: string | null) => (etat.memoire = j) },
}))
vi.mock('./stockage', () => ({
  stockageJeton: {
    lire: async () => etat.disque,
    ecrire: async (j: string) => {
      etat.disque = j
    },
  },
}))

const { rafraichirSession } = await import('./rafraichirSession')

beforeEach(() => {
  etat.memoire = 'ancien'
  etat.disque = 'ancien'
  etat.n = 0
  rafraichir.mockReset()
  rafraichir.mockImplementation(async () => {
    await new Promise((fin) => setTimeout(fin, 10))
    return { jeton: `nouveau-${++etat.n}`, expire: 0 }
  })
})

describe('rafraîchissement de la session', () => {
  it('deux demandes simultanées : un seul appel à l’API, le même jeton pour les deux', async () => {
    const [a, b] = await Promise.all([rafraichirSession(), rafraichirSession()])
    expect(rafraichir).toHaveBeenCalledTimes(1)
    expect(a).toBe('nouveau-1')
    expect(b).toBe('nouveau-1')
    expect(etat.disque).toBe('nouveau-1')
  })

  it('reprend le jeton qu’un autre cadre vient d’obtenir, sans rafraîchir à nouveau', async () => {
    etat.disque = 'obtenu-ailleurs'
    expect(await rafraichirSession()).toBe('obtenu-ailleurs')
    expect(rafraichir).not.toHaveBeenCalled()
    expect(etat.memoire).toBe('obtenu-ailleurs')
  })

  it('après un échec, la demande suivante rappelle l’API', async () => {
    rafraichir.mockRejectedValueOnce(new Error('500'))
    await expect(rafraichirSession()).rejects.toThrow('500')
    expect(await rafraichirSession()).toBe('nouveau-1')
  })
})
