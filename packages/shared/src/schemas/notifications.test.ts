import { describe, expect, it } from 'vitest'

import { Appareil, DonneesNotification, titreMotsOuvrables } from './notifications'

describe('notifications', () => {
  it('le titre garde la surprise : ni le contenu ni la date du mot', () => {
    expect(titreMotsOuvrables('Lina', 1)).toBe('Un mot de Lina t’attend')
    expect(titreMotsOuvrables('Lina', 2)).toBe('2 mots de Lina t’attendent')
  })

  it('n’accepte que des jetons Expo Push', () => {
    expect(
      Appareil.safeParse({ jeton: 'ExponentPushToken[abc123]', plateforme: 'android' }).success,
    ).toBe(true)
    expect(Appareil.safeParse({ jeton: 'n’importe quoi', plateforme: 'android' }).success).toBe(
      false,
    )
  })

  it('le lien d’une notification ne mène qu’à un écran connu', () => {
    expect(DonneesNotification.safeParse({ lien: '/pour-moi', rituel: true }).success).toBe(true)
    expect(DonneesNotification.safeParse({ lien: '/mot/6ac40a9f97721756eed70409' }).success).toBe(
      true,
    )
    expect(DonneesNotification.safeParse({ lien: 'https://ailleurs.example' }).success).toBe(false)
  })
})
