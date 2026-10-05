import {
  estVide,
  type ModificationBrouillon,
  type TypeMot,
  type VueMedia,
  type VueMotAuteur,
} from '@billets-doux/shared'
import { useCallback, useEffect, useRef, useState } from 'react'

import { api } from './client'
import { messageErreur } from './formulaires'

export type ChampsBrouillon = {
  type: TypeMot
  titre: string
  texte: string
  indice: string
  manuscrit: boolean
  photo: VueMedia | null
  vocal: VueMedia | null
}

export type EtatSauvegarde = 'vide' | 'modifie' | 'enCours' | 'enregistre' | 'erreur'

/** Délai entre la dernière modification et l'enregistrement automatique. */
const DELAI_MS = 2000

export const champsVides = (type: TypeMot = 'mot'): ChampsBrouillon => ({
  type,
  titre: '',
  texte: '',
  indice: '',
  manuscrit: true,
  photo: null,
  vocal: null,
})

export const champsDepuis = (mot: VueMotAuteur): ChampsBrouillon => ({
  type: mot.type,
  titre: mot.titre ?? '',
  texte: mot.texte ?? '',
  indice: mot.indice ?? '',
  manuscrit: mot.manuscrit,
  photo: mot.photo,
  vocal: mot.vocal,
})

const versApi = (c: ChampsBrouillon): Required<ModificationBrouillon> => ({
  type: c.type,
  titre: c.titre.trim() || null,
  texte: c.texte.trim() ? c.texte : null,
  indice: c.indice.trim() || null,
  manuscrit: c.manuscrit,
  photo: c.photo?.id ?? null,
  vocal: c.vocal?.id ?? null,
})

const vide = (c: ChampsBrouillon) =>
  estVide({ texte: c.texte, photo: c.photo?.id, vocal: c.vocal?.id })

/**
 * Brouillon enregistré automatiquement dans la réserve pendant l'écriture :
 * quelques secondes après la dernière modification, à la demande (`forcer`) et en quittant.
 * Un mot vide n'est jamais envoyé. Les enregistrements passent par une file :
 * jamais deux en parallèle, donc jamais deux brouillons créés pour un même mot.
 */
export function useBrouillon(initial: { id: string | null; champs: ChampsBrouillon }) {
  const [champs, setChamps] = useState(initial.champs)
  const [id, setId] = useState(initial.id)
  const [etat, setEtat] = useState<EtatSauvegarde>(initial.id ? 'enregistre' : 'vide')
  const [erreur, setErreur] = useState<string | null>(null)
  /** Faux tant que la personne n'a rien modifié (pas de message « mot vide » d'entrée). */
  const [touche, setTouche] = useState(false)

  const idCourant = useRef(initial.id)
  const file = useRef<Promise<void>>(Promise.resolve())
  const version = useRef(0)
  const versionEnregistree = useRef(0)
  const dernier = useRef(champs)

  useEffect(() => {
    dernier.current = champs
  }, [champs])

  const sauver = useCallback((instantane: ChampsBrouillon, numero: number) => {
    file.current = file.current.then(async () => {
      if (numero <= versionEnregistree.current) return
      if (vide(instantane)) {
        setEtat('vide')
        return
      }
      setEtat('enCours')
      try {
        if (idCourant.current) {
          await api.modifierBrouillon(idCourant.current, versApi(instantane))
        } else {
          const mot = await api.creerBrouillon(versApi(instantane))
          idCourant.current = mot.id
          setId(mot.id)
        }
        versionEnregistree.current = numero
        setErreur(null)
        setEtat(numero === version.current ? 'enregistre' : 'modifie')
      } catch (e) {
        setErreur(messageErreur(e))
        setEtat('erreur')
      }
    })
    return file.current
  }, [])

  const modifier = useCallback((changement: Partial<ChampsBrouillon>) => {
    version.current += 1
    setChamps((c) => ({ ...c, ...changement }))
    setEtat('modifie')
    setTouche(true)
  }, [])

  // Enregistrement automatique, quelques secondes après la dernière modification.
  useEffect(() => {
    if (etat !== 'modifie') return
    const minuteur = setTimeout(() => void sauver(champs, version.current), DELAI_MS)
    return () => clearTimeout(minuteur)
  }, [champs, etat, sauver])

  // En quittant l'écran, ce qui n'est pas encore enregistré part tout de suite.
  useEffect(() => {
    const v = version
    const enregistree = versionEnregistree
    const d = dernier
    return () => {
      if (v.current > enregistree.current) void sauver(d.current, v.current)
    }
  }, [sauver])

  return {
    champs,
    id,
    etat,
    erreur,
    touche,
    estVide: vide(champs),
    modifier,
    /** Enregistre maintenant (avant d'ouvrir l'enregistreur, avant de partir) ; renvoie l'id. */
    forcer: async () => {
      await sauver(dernier.current, version.current)
      return idCourant.current
    },
    /** Supprime le brouillon (et ses médias) ; rien à faire s'il n'a jamais été enregistré. */
    supprimer: async () => {
      version.current = Number.MAX_SAFE_INTEGER
      versionEnregistree.current = Number.MAX_SAFE_INTEGER
      await file.current
      if (idCourant.current) await api.supprimerBrouillon(idCourant.current)
    },
  }
}
