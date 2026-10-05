import { z } from 'zod'

import {
  type Connexion,
  type Inscription,
  type MiseAJourCompte,
  Moi,
  Session,
} from '../schemas/comptes'
import {
  type DemandeTeleversement,
  LectureMedia,
  type ModificationBrouillon,
  type NouveauBrouillon,
  Reserve,
  Suppression,
  Televersement,
  VueMedia,
  VueMotAuteur,
} from '../schemas/mots'
import { CorpsErreur, ErreurApi, MESSAGE_RESEAU } from './erreurs'

type Options = {
  baseUrl: string
  /** Jeton de session courant, ou null. */
  jeton: () => string | null
  fetchImpl?: typeof fetch
}

/** Client des routes de l'appli (`/api/comptes/*`, `/api/duos/*`). */
export function creerClient({ baseUrl, jeton, fetchImpl = fetch }: Options) {
  const racine = baseUrl.replace(/\/$/, '')

  async function appel<S extends z.ZodType>(
    schema: S,
    methode: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    chemin: string,
    corps?: unknown,
  ): Promise<z.infer<S>> {
    const entetes: Record<string, string> = { Accept: 'application/json' }
    if (corps !== undefined) entetes['Content-Type'] = 'application/json'
    const j = jeton()
    if (j) entetes.Authorization = `JWT ${j}`

    let res: Response
    try {
      res = await fetchImpl(`${racine}${chemin}`, {
        method: methode,
        headers: entetes,
        body: corps === undefined ? undefined : JSON.stringify(corps),
      })
    } catch {
      throw new ErreurApi(MESSAGE_RESEAU, 0)
    }

    const donnees: unknown = await res.json().catch(() => null)
    if (!res.ok) {
      const erreur = CorpsErreur.safeParse(donnees)
      throw new ErreurApi(
        erreur.success ? erreur.data.erreur : `Erreur inattendue (HTTP ${res.status}).`,
        res.status,
        erreur.success ? erreur.data.champs : undefined,
      )
    }
    return schema.parse(donnees)
  }

  return {
    inscription: (donnees: Inscription) =>
      appel(Session, 'POST', '/api/comptes/inscription', donnees),
    connexion: (donnees: Connexion) => appel(Session, 'POST', '/api/comptes/connexion', donnees),
    rafraichir: () => appel(Session, 'POST', '/api/comptes/rafraichir'),
    moi: () => appel(Moi, 'GET', '/api/comptes/moi'),
    mettreAJour: (donnees: MiseAJourCompte) => appel(Moi, 'PATCH', '/api/comptes/moi', donnees),
    inviter: () => appel(Moi, 'POST', '/api/duos/inviter'),
    rejoindre: (code: string) => appel(Moi, 'POST', '/api/duos/rejoindre', { code }),
    reserve: () => appel(Reserve, 'GET', '/api/mots/reserve'),
    creerBrouillon: (mot: NouveauBrouillon) =>
      appel(VueMotAuteur, 'POST', '/api/mots/brouillons', mot),
    modifierBrouillon: (id: string, modification: ModificationBrouillon) =>
      appel(VueMotAuteur, 'PATCH', `/api/mots/brouillons/${id}`, modification),
    supprimerBrouillon: (id: string) => appel(Suppression, 'DELETE', `/api/mots/brouillons/${id}`),
    demanderTeleversement: (demande: DemandeTeleversement) =>
      appel(Televersement, 'POST', '/api/medias/televersement', demande),
    confirmerMedia: (id: string) => appel(VueMedia, 'POST', `/api/medias/${id}/confirmer`),
    lireMedia: (id: string) => appel(LectureMedia, 'GET', `/api/medias/${id}/lecture`),
    /** Ferme la session côté serveur (route d'authentification de Payload). */
    deconnexion: () => appel(z.unknown(), 'POST', '/api/users/logout'),
  }
}

export type ClientApi = ReturnType<typeof creerClient>
