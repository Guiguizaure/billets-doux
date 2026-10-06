import {
  type CalendrierDestinataire,
  type CaseRecue,
  jourLocal,
  LIMITES,
  type LettreRecue,
  type MotOuvert,
  type Reaction,
  type Repondre,
  type VueReponse,
} from '@billets-doux/shared'
import type { Media, Mot, Reponse, User } from '@billets-doux/shared/payload-types'
import type { PayloadRequest } from 'payload'

import { ErreurMetier } from '@/lib/erreurs'
import { idDe } from '@/lib/ids'
import { enTransaction } from '@/lib/transaction'

import { duoCourant } from './duoCourant'
import { mediaDuProprietaire, vueMedia } from './medias'
import { notify } from './notifications'

const INTROUVABLE = 'Mot introuvable.'

const atteint = (unlockAt: string | null | undefined, maintenant: Date) =>
  Boolean(unlockAt) && new Date(unlockAt as string).getTime() <= maintenant.getTime()

/**
 * Le calendrier « Pour moi » du destinataire. C'est ici que se joue le verrouillage :
 * une case scellée ne porte que sa date, son type, son indice (si le destinataire les affiche)
 * et son heure d'ouverture. Un mot « Dans la semaine » n'existe pour lui qu'à son heure :
 * avant, il ne compte que dans `surprises`.
 */
export async function calendrierDestinataire(
  req: PayloadRequest,
  userId: string,
  maintenant = new Date(),
): Promise<CalendrierDestinataire> {
  const { partenaireId } = await duoCourant(req, userId)
  const [moi, auteur] = await Promise.all([
    req.payload.findByID({ collection: 'users', id: userId, depth: 0, req }),
    req.payload.findByID({ collection: 'users', id: partenaireId, depth: 0, req }),
  ])
  const { docs } = await req.payload.find({
    collection: 'mots',
    where: {
      and: [{ destinataire: { equals: userId } }, { statut: { in: ['programme', 'ouvert'] } }],
    },
    sort: 'unlockAt',
    depth: 0,
    limit: 1000,
    req,
  })
  const reactions = await reactionsDe(
    req,
    docs.filter((m) => m.statut === 'ouvert').map((m) => m.id),
  )
  const indicesVisibles = moi.reglages?.indicesVisibles !== false

  const cases: CaseRecue[] = []
  const lettres: LettreRecue[] = []
  let surprises = 0
  for (const mot of docs) {
    const ouvert = mot.statut === 'ouvert'
    if (mot.mode === 'ouvre_quand') {
      lettres.push({
        id: mot.id,
        titre: mot.titreOuvreQuand ?? '',
        type: mot.type,
        etat: ouvert ? 'ouvert' : 'scelle',
        ouvertLe: mot.openedAt ?? null,
      })
      continue
    }
    if (mot.mode === 'semaine_hasard' && !ouvert && !atteint(mot.unlockAt, maintenant)) {
      surprises += 1
      continue
    }
    if (!mot.jourOuverture || !mot.unlockAt) continue
    cases.push({
      id: mot.id,
      jour: mot.jourOuverture,
      unlockAt: mot.unlockAt,
      type: mot.type,
      etat: ouvert ? 'ouvert' : atteint(mot.unlockAt, maintenant) ? 'a_ouvrir' : 'scelle',
      indice: !ouvert && indicesVisibles ? (mot.indice ?? null) : null,
      ouvertLe: mot.openedAt ?? null,
      ouvertAvecJoker: Boolean(mot.ouvertAvecJoker),
      reaction: reactions.get(mot.id) ?? null,
    })
  }

  return {
    expediteur: { prenom: auteur.prenom },
    aujourdhui: jourLocal(maintenant, moi.fuseauHoraire),
    jokersRestants: await jokersRestants(req, moi, maintenant),
    cases,
    surprises,
    lettres,
  }
}

/** Jokers encore disponibles ce mois-ci (renouvelés le 1er, dans le fuseau du destinataire). */
async function jokersRestants(req: PayloadRequest, moi: User, maintenant: Date) {
  const mois = jourLocal(maintenant, moi.fuseauHoraire).slice(0, 7)
  const { docs } = await req.payload.find({
    collection: 'mots',
    where: {
      and: [{ destinataire: { equals: moi.id } }, { ouvertAvecJoker: { equals: true } }],
    },
    depth: 0,
    limit: 1000,
    req,
  })
  const utilises = docs.filter(
    (m) => m.openedAt && jourLocal(new Date(m.openedAt), moi.fuseauHoraire).slice(0, 7) === mois,
  ).length
  return Math.max(0, LIMITES.jokersParMois - utilises)
}

/**
 * Ouvre un mot pour son destinataire. Avant son heure, seul le joker le permet, et seulement
 * pour un mot à date ; un mot « Dans la semaine » n'existe pas avant son heure (404).
 * Ouvrir un mot déjà ouvert le renvoie simplement.
 */
export async function ouvrir(
  req: PayloadRequest,
  userId: string,
  motId: string,
  options: { joker: boolean },
  maintenant = new Date(),
): Promise<MotOuvert> {
  await enTransaction(req, async () => {
    const mot = await motRecu(req, userId, motId)
    if (mot.statut === 'ouvert') return
    if (mot.statut !== 'programme') throw new ErreurMetier(404, INTROUVABLE)

    let avecJoker = false
    if (mot.mode === 'semaine_hasard' && !atteint(mot.unlockAt, maintenant)) {
      throw new ErreurMetier(404, INTROUVABLE)
    }
    if (mot.mode === 'date' && !atteint(mot.unlockAt, maintenant)) {
      if (!options.joker) {
        throw new ErreurMetier(403, 'Ce mot est encore scellé : il s’ouvrira à son heure.')
      }
      const moi = await req.payload.findByID({ collection: 'users', id: userId, depth: 0, req })
      if ((await jokersRestants(req, moi, maintenant)) < 1) {
        throw new ErreurMetier(409, 'Ton joker de ce mois-ci est déjà utilisé.')
      }
      // Écrire sur le compte sérialise deux jokers simultanés.
      await req.payload.update({
        collection: 'users',
        id: userId,
        data: { dernierJokerLe: maintenant.toISOString() },
        req,
      })
      avecJoker = true
    }

    await req.payload.update({
      collection: 'mots',
      id: motId,
      data: { statut: 'ouvert', openedAt: maintenant.toISOString(), ouvertAvecJoker: avecJoker },
      req,
    })
  })
  return lireMot(req, userId, motId)
}

/** Un mot ouvert, en entier : pour son destinataire, ou pour son auteur qui le relit. */
export async function lireMot(
  req: PayloadRequest,
  userId: string,
  motId: string,
): Promise<MotOuvert> {
  const mot = await req.payload
    .findByID({ collection: 'mots', id: motId, depth: 1, req })
    .catch(() => null)
  const auteurId = mot ? idDe(mot.auteur) : null
  const destinataireId = mot ? idDe(mot.destinataire) : null
  if (!mot || mot.statut !== 'ouvert' || (userId !== auteurId && userId !== destinataireId)) {
    throw new ErreurMetier(404, INTROUVABLE)
  }
  const [auteur, destinataire, reponse] = await Promise.all([
    req.payload.findByID({ collection: 'users', id: auteurId ?? '', depth: 0, req }),
    req.payload.findByID({ collection: 'users', id: destinataireId ?? '', depth: 0, req }),
    reponseDe(req, mot.id),
  ])
  const media = (valeur: Mot['photo']) =>
    valeur && typeof valeur === 'object' ? vueMedia(valeur as Media) : null
  return {
    id: mot.id,
    type: mot.type,
    texte: mot.texte ?? null,
    manuscrit: mot.manuscrit ?? true,
    photo: media(mot.photo),
    vocal: media(mot.vocal),
    jour: mot.mode === 'ouvre_quand' ? null : (mot.jourOuverture ?? null),
    titreOuvreQuand: mot.titreOuvreQuand ?? null,
    ouvertLe: mot.openedAt ?? new Date().toISOString(),
    ouvertAvecJoker: Boolean(mot.ouvertAvecJoker),
    auteur: { prenom: auteur.prenom },
    destinataire: { prenom: destinataire.prenom },
    vuParAuteur: userId === auteurId,
    reponse: reponse ? vueReponse(reponse) : null,
  }
}

/** La réaction du destinataire : modifiable à tout moment, ou retirée (null). */
export async function reagir(
  req: PayloadRequest,
  userId: string,
  motId: string,
  reaction: Reaction | null,
): Promise<VueReponse> {
  await motOuvertRecu(req, userId, motId)
  const existante = await reponseDe(req, motId)
  const reponse = existante
    ? await req.payload.update({
        collection: 'reponses',
        id: existante.id,
        data: { reaction },
        depth: 1,
        req,
      })
    : await req.payload.create({
        collection: 'reponses',
        data: { mot: motId, auteur: userId, reaction },
        depth: 1,
        req,
      })
  return vueReponse(reponse)
}

/** Une seule réponse écrite (140 signes) ou vocale (30 s) par mot, non modifiable. */
export async function repondre(
  req: PayloadRequest,
  userId: string,
  motId: string,
  contenu: Repondre,
  maintenant = new Date(),
): Promise<VueReponse> {
  await motOuvertRecu(req, userId, motId)
  const existante = await reponseDe(req, motId)
  if (existante?.envoyeeLe) throw new ErreurMetier(409, 'Tu as déjà répondu à ce mot.')

  let donnees: Partial<Reponse>
  if ('vocal' in contenu) {
    const media = await mediaDuProprietaire(req, userId, contenu.vocal)
    if (media.nature !== 'vocal' || media.statut !== 'pret') {
      throw new ErreurMetier(400, 'Vocal invalide.')
    }
    if ((media.duree ?? 0) > LIMITES.reponseVocalSecondes + 0.5) {
      throw new ErreurMetier(400, 'Une réponse vocale dure 30 secondes au plus.')
    }
    const dejaPris = await Promise.all([
      req.payload.count({
        collection: 'mots',
        where: { or: [{ photo: { equals: media.id } }, { vocal: { equals: media.id } }] },
        req,
      }),
      req.payload.count({ collection: 'reponses', where: { vocal: { equals: media.id } }, req }),
    ])
    if (dejaPris.some((c) => c.totalDocs > 0)) {
      throw new ErreurMetier(400, 'Ce vocal sert déjà ailleurs.')
    }
    donnees = { vocal: media.id, texte: null }
  } else {
    donnees = { texte: contenu.texte, vocal: null }
  }

  const envoi = { ...donnees, envoyeeLe: maintenant.toISOString() }
  const reponse = existante
    ? await req.payload.update({
        collection: 'reponses',
        id: existante.id,
        data: envoi,
        depth: 1,
        req,
      })
    : await req.payload.create({
        collection: 'reponses',
        data: { mot: motId, auteur: userId, ...envoi },
        depth: 1,
        req,
      })
  // L'auteur est prévenu, sans le texte : « Léo t'a répondu ».
  const mot = await req.payload.findByID({ collection: 'mots', id: motId, depth: 1, req })
  const auteurId = idDe(mot.auteur)
  const destinataire = typeof mot.destinataire === 'object' ? mot.destinataire : null
  if (auteurId && destinataire) {
    await notify(req.payload, auteurId, { type: 'reponse', de: destinataire.prenom, motId })
  }
  return vueReponse(reponse)
}

async function motRecu(req: PayloadRequest, userId: string, motId: string) {
  const mot = await req.payload
    .findByID({ collection: 'mots', id: motId, depth: 0, req })
    .catch(() => null)
  if (!mot || idDe(mot.destinataire) !== userId) throw new ErreurMetier(404, INTROUVABLE)
  return mot
}

async function motOuvertRecu(req: PayloadRequest, userId: string, motId: string) {
  const mot = await motRecu(req, userId, motId)
  if (mot.statut !== 'ouvert') throw new ErreurMetier(409, 'Ouvre d’abord ce mot.')
  return mot
}

async function reponseDe(req: PayloadRequest, motId: string) {
  const { docs } = await req.payload.find({
    collection: 'reponses',
    where: { mot: { equals: motId } },
    limit: 1,
    depth: 1,
    req,
  })
  return docs[0] ?? null
}

/** Réponses de plusieurs mots d'un coup (calendriers de l'auteur et du destinataire). */
export async function reponsesDe(req: PayloadRequest, motIds: string[]) {
  if (motIds.length === 0) return new Map<string, Reponse>()
  const { docs } = await req.payload.find({
    collection: 'reponses',
    where: { mot: { in: motIds } },
    limit: motIds.length,
    depth: 1,
    req,
  })
  return new Map(docs.map((r) => [idDe(r.mot) ?? '', r]))
}

async function reactionsDe(req: PayloadRequest, motIds: string[]) {
  const reponses = await reponsesDe(req, motIds)
  return new Map([...reponses].map(([id, r]) => [id, r.reaction ?? null]))
}

export function vueReponse(reponse: Reponse): VueReponse {
  return {
    reaction: reponse.reaction ?? null,
    texte: reponse.texte ?? null,
    vocal: reponse.vocal && typeof reponse.vocal === 'object' ? vueMedia(reponse.vocal) : null,
    envoyeeLe: reponse.envoyeeLe ?? null,
  }
}
