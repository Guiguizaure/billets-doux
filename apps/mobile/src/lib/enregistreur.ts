import { LIMITES } from '@billets-doux/shared'
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Platform } from 'react-native'

import { ControleurEnregistrement } from './controleurEnregistrement'

/** m4a / AAC, mono, 64 kbit/s : ~1,5 Mo pour 3 minutes de voix. */
const OPTIONS = {
  ...RecordingPresets.HIGH_QUALITY,
  numberOfChannels: 1,
  bitRate: 64_000,
  isMeteringEnabled: true,
}

export type EtatEnregistreur =
  'inactif' | 'enregistrement' | 'pause' | 'termine' | 'refuse' | 'indisponible'

/** Le web de démonstration n'enregistre pas (brief) : seule la lecture y est possible. */
export const enregistrementPossible = Platform.OS !== 'web'

/** Niveau sonore (dB, de −160 à 0) ramené entre 0 et 1 pour dessiner l'onde. */
const niveau = (db: number) => Math.min(1, Math.max(0.06, (db + 55) / 55))

/**
 * Enregistreur de vocal : démarrer, pause, reprendre, arrêter, recommencer.
 * S'arrête tout seul à `maxSecondes`. `niveaux` alimente l'onde en direct.
 */
export function useEnregistreur(maxSecondes: number = LIMITES.vocalSecondes) {
  const recorder = useAudioRecorder(OPTIONS)
  const controleur = useMemo(
    () => new ControleurEnregistrement(recorder, maxSecondes * 1000),
    [recorder, maxSecondes],
  )
  const [etat, setEtat] = useState<EtatEnregistreur>(
    enregistrementPossible ? 'inactif' : 'indisponible',
  )
  const [duree, setDuree] = useState(0)
  const [niveaux, setNiveaux] = useState<number[]>([])
  const [uri, setUri] = useState<string | null>(null)

  /** Arrête et renvoie le fichier et sa durée ; null si rien n'était en cours. */
  const arreter = useCallback(async () => {
    const resultat = await controleur.arreter()
    if (!resultat) return null
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true })
    setDuree(resultat.duree)
    setUri(resultat.uri)
    setEtat('termine')
    return resultat
  }, [controleur])

  /** Démarre un enregistrement : « demarre », ou la raison de l'échec. */
  const demarrer = useCallback(async (): Promise<'demarre' | 'refuse' | 'indisponible'> => {
    if (!enregistrementPossible) return 'indisponible'
    const permission = await requestRecordingPermissionsAsync()
    if (!permission.granted) {
      setEtat('refuse')
      return 'refuse'
    }
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true })
    await controleur.demarrer()
    setDuree(0)
    setNiveaux([])
    setUri(null)
    setEtat('enregistrement')
    return 'demarre'
  }, [controleur])

  // Pendant l'enregistrement : durée, onde, et arrêt automatique à la limite.
  // Une fois l'arrêt lancé, `mesurer()` renvoie null : la durée affichée ne retombe plus à 0.
  useEffect(() => {
    if (etat !== 'enregistrement') return
    const minuteur = setInterval(() => {
      const mesure = controleur.mesurer()
      if (!mesure) return
      setDuree(mesure.duree)
      if (mesure.niveau !== null) {
        setNiveaux((n) => [...n, niveau(mesure.niveau ?? -160)].slice(-400))
      }
      if (mesure.limiteAtteinte) void arreter()
    }, 100)
    return () => clearInterval(minuteur)
  }, [etat, controleur, arreter])

  // En quittant l'écran : coupe le micro si besoin, sans interroger l'enregistreur
  // (expo-audio l'a peut-être déjà libéré).
  useEffect(() => () => controleur.liberer(), [controleur])

  return {
    etat,
    duree,
    niveaux,
    uri,
    demarrer,
    arreter,
    pause: () => {
      controleur.pause()
      setEtat('pause')
    },
    reprendre: () => {
      controleur.reprendre()
      setEtat('enregistrement')
    },
    /** Jette l'enregistrement en cours ou terminé, puis repart de zéro. */
    recommencer: async () => {
      await controleur.arreter()
      return demarrer()
    },
  }
}
