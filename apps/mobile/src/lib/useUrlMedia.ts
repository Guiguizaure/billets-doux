import { useEffect, useState } from 'react'

import { api } from './client'

/**
 * URL de lecture signée d'un média (valable quelques minutes, demandée à l'API).
 * Une URI locale (fichier tout juste enregistré) est utilisée telle quelle.
 */
export function useUrlMedia(mediaId: string | null, uriLocale?: string | null) {
  const [url, setUrl] = useState<string | null>(null)
  const [erreur, setErreur] = useState(false)

  useEffect(() => {
    if (uriLocale || !mediaId) return
    let annule = false
    api
      .lireMedia(mediaId)
      .then((lecture) => {
        if (!annule) setUrl(lecture.url)
      })
      .catch(() => {
        if (!annule) setErreur(true)
      })
    return () => {
      annule = true
    }
  }, [mediaId, uriLocale])

  return { url: uriLocale ?? url, erreur }
}
