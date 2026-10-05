import type { DemandeTeleversement, VueMedia } from '@billets-doux/shared'

import { api } from './client'

type Source = { nature: 'photo'; uri: string } | { nature: 'vocal'; uri: string; duree: number }

/** Progression de l'envoi, de 0 à 1. */
export type SuiviEnvoi = (progression: number) => void

const ESSAIS = 3

/**
 * Envoie un fichier local directement au stockage (URL signée fournie par l'API),
 * puis demande à l'API de confirmer son arrivée. Le fichier ne transite jamais par l'API.
 */
export async function televerser(source: Source, suivi?: SuiviEnvoi): Promise<VueMedia> {
  const fichier = await (await fetch(source.uri)).blob()
  const demande: DemandeTeleversement =
    source.nature === 'photo'
      ? { nature: 'photo', mime: 'image/jpeg', taille: fichier.size }
      : { nature: 'vocal', mime: 'audio/mp4', taille: fichier.size, duree: source.duree }
  const envoi = await api.demanderTeleversement(demande)

  let derniereErreur: unknown
  for (let essai = 1; essai <= ESSAIS; essai++) {
    try {
      await envoyer(envoi.url, envoi.entetes, fichier, suivi)
      return await api.confirmerMedia(envoi.id)
    } catch (e) {
      derniereErreur = e
      await new Promise((r) => setTimeout(r, 800 * essai))
    }
  }
  throw derniereErreur
}

/** PUT avec XMLHttpRequest, seul moyen de suivre la progression sur toutes les plateformes. */
function envoyer(url: string, entetes: Record<string, string>, fichier: Blob, suivi?: SuiviEnvoi) {
  return new Promise<void>((resoudre, rejeter) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    for (const [nom, valeur] of Object.entries(entetes)) xhr.setRequestHeader(nom, valeur)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) suivi?.(e.loaded / e.total)
    }
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resoudre()
        : rejeter(new Error(`Envoi refusé (HTTP ${xhr.status})`))
    xhr.onerror = () => rejeter(new Error('Envoi interrompu'))
    xhr.send(fichier)
  })
}
