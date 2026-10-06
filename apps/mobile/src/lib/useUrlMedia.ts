import { useEffect, useState } from 'react'

import { creerCacheUrls } from './cacheUrls'
import { api } from './client'

/** Les URL signées déjà obtenues, partagées par tous les écrans. */
const cache = creerCacheUrls((id) => api.lireMedia(id))

/**
 * URL de lecture signée d'un média (valable quelques minutes, demandée à l'API une seule
 * fois tant qu'elle est valide). Une URI locale (fichier tout juste enregistré) est utilisée
 * telle quelle.
 */
export function useUrlMedia(mediaId: string | null, uriLocale?: string | null) {
  const [url, setUrl] = useState<string | null>(() => (mediaId ? cache.immediate(mediaId) : null))
  const [erreur, setErreur] = useState(false)

  useEffect(() => {
    if (uriLocale || !mediaId) return
    let annule = false
    cache
      .url(mediaId)
      .then((u) => {
        if (!annule) setUrl(u)
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
