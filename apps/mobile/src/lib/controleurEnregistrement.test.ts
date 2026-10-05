import { DemandeTeleversement } from '@billets-doux/shared'
import { describe, expect, it, vi } from 'vitest'

import { ControleurEnregistrement, type Enregistreur } from './controleurEnregistrement'

/**
 * Faux enregistreur qui reproduit expo-audio sur Android :
 * durée remise à 0 dès l'arrêt, erreur sur tout appel après libération.
 */
function fauxEnregistreur() {
  let enregistre = false
  let pause = false
  let libere = false
  let dureeMs = 0
  const verifier = () => {
    if (libere) {
      throw new Error(
        "Call to function 'AudioRecorder.getStatus' has been rejected. Cannot use shared object that was already released",
      )
    }
  }
  const faux = {
    prepareToRecordAsync: vi.fn(async () => verifier()),
    record: vi.fn(() => {
      verifier()
      enregistre = true
      pause = false
    }),
    pause: vi.fn(() => {
      verifier()
      pause = true
    }),
    stop: vi.fn(async () => {
      verifier()
      enregistre = false
      dureeMs = 0 // Android : la durée retombe à zéro à l'arrêt
    }),
    getStatus: vi.fn(() => {
      verifier()
      return { durationMillis: dureeMs, metering: enregistre ? -20 : undefined }
    }),
    get uri() {
      return 'file:///cache/vocal.m4a'
    },
    /** Le temps passe (seulement pendant l'enregistrement, pas en pause). */
    avancer(ms: number) {
      if (enregistre && !pause) dureeMs += ms
    },
    liberer() {
      libere = true
    },
  }
  return faux satisfies Enregistreur
}

const demande = (duree: number) =>
  DemandeTeleversement.safeParse({ nature: 'vocal', mime: 'audio/mp4', taille: 80_000, duree })

describe('enregistreur complet (écran 3.3)', () => {
  it('« Arrêter » en plein enregistrement garde la durée, même si une mesure arrive après l’arrêt', async () => {
    const faux = fauxEnregistreur()
    const c = new ControleurEnregistrement(faux, 180_000)
    await c.demarrer()
    for (let i = 0; i < 50; i++) {
      faux.avancer(100)
      c.mesurer()
    }
    const resultat = await c.arreter()
    // Le minuteur de l'écran tique encore une fois après stop() : il ne doit rien changer.
    expect(c.mesurer()).toBeNull()
    expect(resultat).toEqual({ uri: 'file:///cache/vocal.m4a', duree: 5 })
    expect(demande(resultat!.duree).success).toBe(true)
  })

  it('pause puis « Arrêter » garde aussi la durée', async () => {
    const faux = fauxEnregistreur()
    const c = new ControleurEnregistrement(faux, 180_000)
    await c.demarrer()
    faux.avancer(3200)
    c.mesurer()
    c.pause()
    faux.avancer(5000) // le temps en pause ne compte pas
    expect((await c.arreter())?.duree).toBe(3.2)
  })

  it('s’arrête une seule fois, même si la limite et le bouton arrivent ensemble', async () => {
    const faux = fauxEnregistreur()
    const c = new ControleurEnregistrement(faux, 180_000)
    await c.demarrer()
    faux.avancer(180_000)
    expect(c.mesurer()?.limiteAtteinte).toBe(true)
    const [a, b] = await Promise.all([c.arreter(), c.arreter()])
    expect(faux.stop).toHaveBeenCalledTimes(1)
    expect([a?.duree, b]).toEqual([180, null])
  })

  it('quitter l’écran après « Joindre au mot » n’interroge plus l’enregistreur libéré', async () => {
    const faux = fauxEnregistreur()
    const c = new ControleurEnregistrement(faux, 180_000)
    await c.demarrer()
    faux.avancer(2000)
    await c.arreter()
    faux.liberer() // expo-audio libère l'enregistreur au démontage
    expect(() => c.liberer()).not.toThrow()
    expect(c.mesurer()).toBeNull()
  })

  it('quitter l’écran en plein enregistrement coupe le micro sans lever d’erreur', async () => {
    const faux = fauxEnregistreur()
    const c = new ControleurEnregistrement(faux, 180_000)
    await c.demarrer()
    faux.avancer(1000)
    faux.liberer()
    expect(() => c.liberer()).not.toThrow()
  })
})

describe('appui maintenu dans la réserve (écran 3.2)', () => {
  it('relâcher renvoie le fichier et une durée acceptée par l’API', async () => {
    const faux = fauxEnregistreur()
    const c = new ControleurEnregistrement(faux, 180_000)
    await c.demarrer()
    faux.avancer(2400) // aucune mesure entre-temps : arrêt direct au relâchement
    const resultat = await c.arreter()
    expect(resultat?.duree).toBe(2.4)
    expect(demande(resultat!.duree).success).toBe(true)
  })

  it('une durée nulle serait refusée par l’API (le bug d’origine)', () => {
    expect(demande(0).success).toBe(false)
  })
})
