import {
  ajouterJours,
  type CarteSouvenir,
  jourLocal,
  libellesJour,
  type Souvenirs,
  type TypeMot,
  type VueNousDeux,
} from '@billets-doux/shared'
import type { Duo, Media, Mot, Reponse, User } from '@billets-doux/shared/payload-types'
import { strToU8, zipSync, type Zippable } from 'fflate'
import { AuthenticationError, LockedAuth, type Payload, type PayloadRequest } from 'payload'

import { ErreurMetier } from '@/lib/erreurs'
import { idDe } from '@/lib/ids'
import {
  deposerFichier,
  lireFichier,
  listerCles,
  supprimer,
  supprimerPrefixe,
  urlTelechargement,
} from '@/lib/stockage'

import { vuePause } from './comptes'
import { exigerHorsDemo } from './demo'
import { duoCourant } from './duoCourant'
import { notify } from './notifications'
import { jokersRestants } from './reception'

const JOURS_MAX_RETROUVAILLES = 365

/** Écran 5.1 « Nous deux ». */
export async function nousDeux(
  req: PayloadRequest,
  userId: string,
  maintenant = new Date(),
): Promise<VueNousDeux> {
  const { duo, partenaireId } = await duoCourant(req, userId)
  const [moi, partenaire, echanges, prevus] = await Promise.all([
    req.payload.findByID({ collection: 'users', id: userId, depth: 0, req }),
    req.payload.findByID({ collection: 'users', id: partenaireId, depth: 0, req }),
    req.payload.count({
      collection: 'mots',
      where: { and: [{ duo: { equals: duo.id } }, { statut: { equals: 'ouvert' } }] },
      req,
    }),
    req.payload.count({
      collection: 'mots',
      where: {
        and: [
          { duo: { equals: duo.id } },
          { auteur: { equals: userId } },
          { statut: { equals: 'programme' } },
        ],
      },
      req,
    }),
  ])
  return {
    moi: { prenom: moi.prenom },
    partenaire: { prenom: partenaire.prenom },
    depuis: duo.rejointLe ?? null,
    motsEchanges: echanges.totalDocs,
    pause: await vuePause(req, duo, userId),
    retrouvailles: duo.retrouvailles ?? null,
    heureDecouverte: moi.heureDecouverte,
    reglages: {
      rappelDoux: moi.reglages?.rappelDoux !== false,
      indicesVisibles: moi.reglages?.indicesVisibles !== false,
    },
    jokersRestants: await jokersRestants(req, moi, maintenant),
    motsPrevus: prevus.totalDocs,
  }
}

/** Pause : plus aucune notification, pour les deux ; les cases continuent de s'ouvrir. */
export async function mettreEnPause(req: PayloadRequest, userId: string, maintenant = new Date()) {
  const { duo } = await duoCourant(req, userId)
  if (duo.statut === 'pause') throw new ErreurMetier(409, 'Le duo est déjà en pause.')
  await req.payload.update({
    collection: 'duos',
    id: duo.id,
    data: { statut: 'pause', pausePar: userId, pauseDepuis: maintenant.toISOString() },
    req,
  })
}

/** Seule la personne qui a mis la pause peut la lever. */
export async function reprendre(req: PayloadRequest, userId: string) {
  const { duo } = await duoCourant(req, userId)
  if (duo.statut !== 'pause') throw new ErreurMetier(409, 'Le duo n’est pas en pause.')
  if (idDe(duo.pausePar) !== userId) {
    throw new ErreurMetier(403, 'Seule la personne qui a mis la pause peut la lever.')
  }
  await req.payload.update({
    collection: 'duos',
    id: duo.id,
    data: { statut: 'actif', pausePar: null, pauseDepuis: null },
    req,
  })
}

/** Jour des retrouvailles, commun au duo : dans le futur, à un an au plus ; null l'efface. */
export async function fixerRetrouvailles(
  req: PayloadRequest,
  userId: string,
  jour: string | null,
  maintenant = new Date(),
) {
  const { duo } = await duoCourant(req, userId)
  if (jour) {
    const moi = await req.payload.findByID({ collection: 'users', id: userId, depth: 0, req })
    const aujourdhui = jourLocal(maintenant, moi.fuseauHoraire)
    if (jour <= aujourdhui) throw new ErreurMetier(400, 'Choisis un jour à venir.')
    if (jour > ajouterJours(aujourdhui, JOURS_MAX_RETROUVAILLES)) {
      throw new ErreurMetier(400, 'Choisis un jour dans l’année qui vient.')
    }
  }
  await req.payload.update({ collection: 'duos', id: duo.id, data: { retrouvailles: jour }, req })
}

/**
 * Ferme le duo. L'autre est prévenu (« Le duo est fermé ») avant la fermeture, sauf si le
 * duo est en pause (plus aucune notification). Les brouillons et mots programmés ne sont pas
 * supprimés : ils deviennent « jamais envoyés », en lecture seule pour leur auteur.
 * Les mots ouverts restent dans les souvenirs des deux.
 */
export async function fermer(
  payload: Payload,
  duo: Duo,
  parUserId: string,
  maintenant = new Date(),
) {
  const partenaireId = duo.membres.map(idDe).find((id) => id && id !== parUserId)
  if (partenaireId) await notify(payload, partenaireId, { type: 'duo_ferme' })
  await payload.update({
    collection: 'mots',
    where: {
      and: [{ duo: { equals: duo.id } }, { statut: { in: ['brouillon', 'programme'] } }],
    },
    data: { statut: 'non_envoye' },
  })
  await payload.update({
    collection: 'duos',
    id: duo.id,
    data: {
      statut: 'ferme',
      fermePar: parUserId,
      fermeLe: maintenant.toISOString(),
      pausePar: null,
      pauseDepuis: null,
    },
  })
}

export async function fermerDuo(req: PayloadRequest, userId: string) {
  await exigerHorsDemo(req.payload, userId, 'Le duo de démo ne peut pas être fermé.')
  const { duo } = await duoCourant(req, userId)
  await fermer(req.payload, duo, userId)
}

// ——— Souvenirs ———

const NOMS: Record<TypeMot, string> = {
  mot: 'un mot',
  poeme: 'un poème',
  photo: 'une photo',
  vocal: 'un vocal',
}
const PREMIERS: Record<TypeMot, string> = {
  mot: 'premier mot',
  poeme: 'premier poème',
  photo: 'première photo',
  vocal: 'premier vocal',
}

/** Mots ouverts entre moi et l'autre (dans les deux sens), plus récents d'abord. */
async function motsOuverts(payload: Payload, userId: string) {
  const { docs } = await payload.find({
    collection: 'mots',
    where: {
      and: [
        { or: [{ auteur: { equals: userId } }, { destinataire: { equals: userId } }] },
        { statut: { equals: 'ouvert' } },
      ],
    },
    sort: '-openedAt',
    depth: 1,
    limit: 2000,
  })
  return docs
}

async function motsJamaisEnvoyes(payload: Payload, userId: string) {
  const { docs } = await payload.find({
    collection: 'mots',
    where: { and: [{ auteur: { equals: userId } }, { statut: { equals: 'non_envoye' } }] },
    sort: '-createdAt',
    depth: 1,
    limit: 2000,
  })
  return docs
}

const objet = <T>(valeur: string | T | null | undefined) =>
  valeur && typeof valeur === 'object' ? valeur : null

function carte(mot: Mot, userId: string): CarteSouvenir {
  const auteur = objet<User>(mot.auteur)
  const deMoi = idDe(mot.auteur) === userId
  const vocal = objet<Media>(mot.vocal)
  return {
    id: mot.id,
    type: mot.type,
    extrait: mot.texte?.trim() ? mot.texte.trim().slice(0, 160) : null,
    manuscrit: mot.manuscrit !== false,
    photo: idDe(mot.photo),
    vocal: vocal ? { id: vocal.id, duree: vocal.duree ?? 0 } : null,
    de: deMoi ? 'moi' : (auteur?.prenom ?? ''),
    deMoi,
    le: mot.statut === 'ouvert' ? (mot.openedAt ?? mot.updatedAt) : mot.createdAt,
    titreOuvreQuand: mot.titreOuvreQuand ?? null,
  }
}

const deux = (n: number) => String(n).padStart(2, '0')

/** Le même jour, `n` mois plus tôt ; null si ce jour n'existe pas (le 31 en avril…). */
function moisAvant(jour: string, n: number) {
  const [a, m, j] = jour.split('-').map(Number) as [number, number, number]
  const total = a * 12 + (m - 1) - n
  const annee = Math.floor(total / 12)
  const mois = (total % 12) + 1
  const joursDuMois = new Date(Date.UTC(annee, mois, 0)).getUTCDate()
  return j <= joursDuMois ? `${annee}-${deux(mois)}-${deux(j)}` : null
}

/** « Ce jour-là » : un mot ouvert il y a un an, six mois, un mois ou une semaine. */
function ceJourLa(mots: Mot[], userId: string, fuseau: string, maintenant: Date) {
  const aujourdhui = jourLocal(maintenant, fuseau)
  const anniversaires = [
    { jour: moisAvant(aujourdhui, 12), duree: 'un an' },
    { jour: moisAvant(aujourdhui, 6), duree: 'six mois' },
    { jour: moisAvant(aujourdhui, 1), duree: 'un mois' },
    { jour: ajouterJours(aujourdhui, -7), duree: 'une semaine' },
  ]
  for (const { jour, duree } of anniversaires) {
    if (!jour) continue
    const mot = mots.find((m) => m.openedAt && jourLocal(new Date(m.openedAt), fuseau) === jour)
    if (!mot) continue
    const deMoi = idDe(mot.auteur) === userId
    const auteurId = idDe(mot.auteur)
    // Le tout premier de ce type, de cet auteur ? (« son premier vocal »)
    const premier = !mots.some(
      (m) =>
        m.type === mot.type &&
        idDe(m.auteur) === auteurId &&
        m.openedAt &&
        mot.openedAt &&
        m.openedAt < mot.openedAt,
    )
    const possessif = deMoi
      ? mot.type === 'photo'
        ? 'ta'
        : 'ton'
      : mot.type === 'photo'
        ? 'sa'
        : 'son'
    const quoi = premier ? `${possessif} ${PREMIERS[mot.type]}` : NOMS[mot.type]
    const qui = deMoi ? 'tu envoyais' : `${objet<User>(mot.auteur)?.prenom ?? ''} t’envoyait`
    return { motId: mot.id, phrase: `Il y a ${duree}, ${qui} ${quoi}.`, type: mot.type }
  }
  return null
}

/** Écran 4.2 : tous les mots ouverts, dans les deux sens, et mes mots jamais envoyés. */
export async function souvenirs(
  req: PayloadRequest,
  userId: string,
  maintenant = new Date(),
): Promise<Souvenirs> {
  const moi = await req.payload.findByID({ collection: 'users', id: userId, depth: 0, req })
  const [ouverts, jamais] = await Promise.all([
    motsOuverts(req.payload, userId),
    motsJamaisEnvoyes(req.payload, userId),
  ])
  const premiers = ouverts
    .map((m) => m.openedAt)
    .filter(Boolean)
    .sort()
  return {
    depuis: premiers[0] ?? null,
    mots: ouverts.map((m) => carte(m, userId)),
    ceJourLa: ceJourLa(ouverts, userId, moi.fuseauHoraire, maintenant),
    jamaisEnvoyes: jamais.map((m) => carte(m, userId)),
  }
}

// ——— Export ———

const echapper = (texte: string) =>
  texte.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const EXTENSIONS: Record<string, string> = { 'image/jpeg': 'jpg', 'audio/mp4': 'm4a' }

/**
 * L'archive des souvenirs : `souvenirs.html` (lisible dans n'importe quel navigateur) et les
 * photos et vocaux. Seulement ce que l'utilisateur a le droit de lire : les mots ouverts
 * dans les deux sens, les réponses, et ses propres mots jamais envoyés.
 */
/** Une archive d'export reste 24 heures dans le stockage (politique de confidentialité). */
export const DUREE_EXPORT_MS = 24 * 60 * 60 * 1000

/**
 * Tâche de la nuit : supprime les archives d'export de plus de 24 heures. Leur nom est
 * l'instant de leur création (`exports/<compte>/<millisecondes>.zip`).
 */
export async function supprimerExportsAnciens(maintenant = new Date()) {
  const limite = maintenant.getTime() - DUREE_EXPORT_MS
  let supprimes = 0
  for (const cle of await listerCles('exports/')) {
    const creation = Number(cle.match(/\/(\d+)\.zip$/)?.[1])
    if (Number.isFinite(creation) && creation < limite) {
      await supprimer(cle)
      supprimes++
    }
  }
  return supprimes
}

export async function exporter(req: PayloadRequest, userId: string, hote: string | null) {
  const { payload } = req
  const moi = await payload.findByID({ collection: 'users', id: userId, depth: 0, req })
  const [ouverts, jamais] = await Promise.all([
    motsOuverts(payload, userId),
    motsJamaisEnvoyes(payload, userId),
  ])
  const { docs: reponses } = await payload.find({
    collection: 'reponses',
    where: { mot: { in: ouverts.map((m) => m.id) } },
    depth: 1,
    limit: 2000,
  })
  const reponseDe = new Map(reponses.map((r) => [idDe(r.mot), r]))

  const fichiers: Zippable = {}
  const joindre = async (valeur: Mot['photo'] | Reponse['vocal']) => {
    const media = objet<Media>(valeur)
    if (!media) return null
    const chemin = `medias/${media.id}.${EXTENSIONS[media.mime] ?? 'bin'}`
    if (!fichiers[chemin]) {
      // Déjà compressés (JPEG, AAC) : rangés tels quels dans l'archive.
      fichiers[chemin] = [await lireFichier(media.cle), { level: 0 }]
    }
    return { chemin, nature: media.nature }
  }

  const section = async (titre: string, mots: Mot[], jamaisEnvoyes: boolean) => {
    const blocs: string[] = []
    for (const mot of mots) {
      const deMoi = idDe(mot.auteur) === userId
      const auteur = deMoi ? 'moi' : (objet<User>(mot.auteur)?.prenom ?? '')
      const destinataire = objet<User>(mot.destinataire)?.prenom ?? ''
      const quand = mot.statut === 'ouvert' ? mot.openedAt : mot.createdAt
      const date = quand ? libellesJour(jourLocal(new Date(quand), moi.fuseauHoraire)).long : ''
      const morceaux = [
        `<p class="meta">De ${echapper(auteur)}${deMoi ? ` pour ${echapper(destinataire)}` : ''} · ${echapper(date)}${mot.titreOuvreQuand ? ` · Ouvre quand ${echapper(mot.titreOuvreQuand)}` : ''}</p>`,
      ]
      if (mot.texte?.trim()) {
        morceaux.push(
          `<p class="${mot.manuscrit !== false ? 'manuscrit' : 'texte'}">${echapper(mot.texte).replace(/\n/g, '<br>')}</p>`,
        )
      }
      const photo = await joindre(mot.photo)
      if (photo) morceaux.push(`<img src="${photo.chemin}" alt="Photo">`)
      const vocal = await joindre(mot.vocal)
      if (vocal) morceaux.push(`<audio controls src="${vocal.chemin}"></audio>`)
      const reponse = jamaisEnvoyes ? undefined : reponseDe.get(mot.id)
      if (reponse && (reponse.texte || reponse.vocal)) {
        const qui = deMoi ? destinataire : 'moi'
        morceaux.push(`<div class="reponse"><p class="meta">Réponse de ${echapper(qui)}</p>`)
        if (reponse.texte) morceaux.push(`<p class="manuscrit">${echapper(reponse.texte)}</p>`)
        const vocalReponse = await joindre(reponse.vocal)
        if (vocalReponse) morceaux.push(`<audio controls src="${vocalReponse.chemin}"></audio>`)
        morceaux.push('</div>')
      }
      blocs.push(`<article>${morceaux.join('\n')}</article>`)
    }
    return blocs.length ? `<h2>${titre}</h2>\n${blocs.join('\n')}` : ''
  }

  const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Billets doux · souvenirs de ${echapper(moi.prenom)}</title>
<style>
body{margin:0;background:#F8F1E3;color:#2A2346;font:16px/1.5 system-ui,sans-serif}
main{max-width:640px;margin:0 auto;padding:24px 16px}
h1{font-family:Georgia,serif;font-weight:400;font-size:32px}
h2{font-family:Georgia,serif;font-weight:400;margin-top:40px}
article{background:#FFFBF3;border:1px solid #D9CBAE;border-radius:20px;padding:16px 20px;margin:16px 0}
.meta{color:#645C7E;font-size:13px;margin:0 0 8px}
.manuscrit{font-family:'Comic Sans MS','Bradley Hand',cursive;font-size:20px}
img{max-width:100%;border-radius:8px}audio{width:100%}
.reponse{border-top:1px dashed #D9CBAE;margin-top:12px;padding-top:12px}
</style></head><body><main>
<h1>Tout ce qu’on s’est écrit</h1>
<p class="meta">Exporté le ${echapper(libellesJour(jourLocal(new Date(), moi.fuseauHoraire)).long)}</p>
${await section('Mots ouverts', ouverts, false)}
${await section('Jamais envoyés', jamais, true)}
</main></body></html>`
  fichiers['souvenirs.html'] = strToU8(html)

  // Une seule archive à la fois par compte : la précédente est supprimée.
  const prefixe = `exports/${userId}/`
  await supprimerPrefixe(prefixe)
  const cle = `${prefixe}${Date.now()}.zip`
  await deposerFichier(cle, zipSync(fichiers), 'application/zip')
  const lien = await urlTelechargement({ cle, nomFichier: 'billets-doux-souvenirs.zip', hote })
  return { ...lien, mots: ouverts.length + jamais.length }
}

// ——— Suppression du compte ———

/**
 * Supprime le compte et tout ce que la personne a écrit (même les mots déjà ouverts par
 * l'autre), ses réponses et ses médias, fichiers compris. Le duo en cours est fermé (l'autre
 * est prévenu) ; l'autre garde les mots qu'il avait écrits.
 */
export async function supprimerCompte(req: PayloadRequest, userId: string, motDePasse: string) {
  const { payload } = req
  await exigerHorsDemo(payload, userId, 'Le compte de démo ne peut pas être supprimé.')
  const user = await payload.findByID({ collection: 'users', id: userId, depth: 1 })
  try {
    await payload.login({ collection: 'users', data: { email: user.email, password: motDePasse } })
  } catch (e) {
    if (e instanceof LockedAuth) {
      throw new ErreurMetier(423, 'Trop d’essais : réessaie dans 10 minutes.')
    }
    if (e instanceof AuthenticationError) throw new ErreurMetier(403, 'Mot de passe incorrect.')
    throw e
  }

  const duo = objet<Duo>(user.duo)
  if (duo && (duo.statut === 'actif' || duo.statut === 'pause')) await fermer(payload, duo, userId)
  if (duo && duo.statut === 'invitation') {
    await payload.delete({ collection: 'duos', id: duo.id })
  }
  // Les hooks suppriment, avec chaque mot, sa photo, son vocal et la réponse reçue.
  await payload.delete({ collection: 'mots', where: { auteur: { equals: userId } } })
  // Avec chaque réponse, son vocal.
  await payload.delete({ collection: 'reponses', where: { auteur: { equals: userId } } })
  await payload.delete({ collection: 'medias', where: { proprietaire: { equals: userId } } })
  await payload.delete({ collection: 'envois-push', where: { utilisateur: { equals: userId } } })
  await supprimerPrefixe(`exports/${userId}/`)
  await payload.delete({ collection: 'users', id: userId })

  // Un duo fermé dont plus aucun membre n'existe ne sert plus à personne.
  const { docs: anciens } = await payload.find({
    collection: 'duos',
    where: { membres: { contains: userId } },
    depth: 0,
    limit: 100,
  })
  for (const ancien of anciens) {
    const autres = ancien.membres
      .map(idDe)
      .filter((id): id is string => Boolean(id) && id !== userId)
    const restants = await payload.count({ collection: 'users', where: { id: { in: autres } } })
    if (restants.totalDocs === 0) await payload.delete({ collection: 'duos', id: ancien.id })
  }
}
