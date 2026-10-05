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
import { CalendrierAuteur, MotProgramme, type Programmation } from '../schemas/programmation'
import { CalendrierDestinataire, MotOuvert, type Repondre, VueReponse } from '../schemas/reception'
import type { Reaction, Rythme } from '../enums'
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
    methode: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
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
    calendrier: () => appel(CalendrierAuteur, 'GET', '/api/mots/calendrier'),
    programmer: (id: string, programmation: Programmation) =>
      appel(MotProgramme, 'POST', `/api/mots/${id}/programmation`, programmation),
    remettreEnReserve: (id: string) =>
      appel(VueMotAuteur, 'DELETE', `/api/mots/${id}/programmation`),
    changerRythme: (rythme: Rythme) =>
      appel(CalendrierAuteur, 'PATCH', '/api/mots/calendrier/rythme', { rythme }),
    pourMoi: () => appel(CalendrierDestinataire, 'GET', '/api/mots/pour-moi'),
    ouvrir: (id: string, joker = false) =>
      appel(MotOuvert, 'POST', `/api/mots/${id}/ouverture`, { joker }),
    lireMot: (id: string) => appel(MotOuvert, 'GET', `/api/mots/${id}/lecture`),
    reagir: (id: string, reaction: Reaction | null) =>
      appel(VueReponse, 'PUT', `/api/mots/${id}/reaction`, { reaction }),
    repondre: (id: string, reponse: Repondre) =>
      appel(VueReponse, 'POST', `/api/mots/${id}/reponse`, reponse),
    /** Ferme la session côté serveur (route d'authentification de Payload). */
    deconnexion: () => appel(z.unknown(), 'POST', '/api/users/logout'),
  }
}

export type ClientApi = ReturnType<typeof creerClient>
