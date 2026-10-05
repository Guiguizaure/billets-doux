import { LIMITES } from '@billets-doux/shared'
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio'
import { useCallback, useEffect, useState } from 'react'
import { Platform } from 'react-native'

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
  const [etat, setEtat] = useState<EtatEnregistreur>(
    enregistrementPossible ? 'inactif' : 'indisponible',
  )
  const [duree, setDuree] = useState(0)
  const [niveaux, setNiveaux] = useState<number[]>([])
  const [uri, setUri] = useState<string | null>(null)

  const arreter = useCallback(async () => {
    const statut = recorder.getStatus()
    await recorder.stop()
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true })
    setDuree(statut.durationMillis / 1000)
    setUri(recorder.uri)
    setEtat('termine')
    return { uri: recorder.uri, duree: statut.durationMillis / 1000 }
  }, [recorder])

  /** Démarre un enregistrement : « demarre », ou la raison de l'échec. */
  const demarrer = useCallback(async (): Promise<'demarre' | 'refuse' | 'indisponible'> => {
    if (!enregistrementPossible) return 'indisponible'
    const permission = await requestRecordingPermissionsAsync()
    if (!permission.granted) {
      setEtat('refuse')
      return 'refuse'
    }
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true })
    await recorder.prepareToRecordAsync()
    recorder.record()
    setDuree(0)
    setNiveaux([])
    setUri(null)
    setEtat('enregistrement')
    return 'demarre'
  }, [recorder])

  // Pendant l'enregistrement : durée, onde, et arrêt automatique à la limite.
  useEffect(() => {
    if (etat !== 'enregistrement') return
    const minuteur = setInterval(() => {
      const statut = recorder.getStatus()
      setDuree(statut.durationMillis / 1000)
      if (statut.metering !== undefined) {
        setNiveaux((n) => [...n, niveau(statut.metering ?? -160)].slice(-400))
      }
      if (statut.durationMillis >= maxSecondes * 1000) void arreter()
    }, 100)
    return () => clearInterval(minuteur)
  }, [etat, recorder, maxSecondes, arreter])

  // En quittant l'écran en plein enregistrement, on coupe le micro.
  useEffect(
    () => () => {
      if (recorder.getStatus().isRecording) void recorder.stop()
    },
    [recorder],
  )

  return {
    etat,
    duree,
    niveaux,
    uri,
    demarrer,
    arreter,
    pause: () => {
      recorder.pause()
      setEtat('pause')
    },
    reprendre: () => {
      recorder.record()
      setEtat('enregistrement')
    },
    /** Jette l'enregistrement en cours ou terminé, puis repart de zéro. */
    recommencer: async () => {
      if (recorder.getStatus().isRecording) await recorder.stop()
      return demarrer()
    },
  }
}
