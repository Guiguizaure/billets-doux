import { heureLocale } from '@billets-doux/shared'
import type { MongooseAdapter } from '@payloadcms/db-mongodb'
import type { Payload } from 'payload'

import { idDe } from '@/lib/ids'

import { notify } from './notifications'

/** Au-delà, un mot ouvrable depuis longtemps (serveur arrêté) est marqué sans notification. */
const RATTRAPAGE_MS = 24 * 60 * 60_000
const SEPT_JOURS_MS = 7 * 24 * 60 * 60_000
/** Le rappel doux part entre 18 h et 21 h, heure de l'auteur. */
const RAPPEL_DEBUT = '18:00'
const RAPPEL_FIN = '21:00'
/** En dessous de ce nombre de mots dans les 7 jours, le calendrier « se vide ». */
const SEUIL_RAPPEL = 2

/**
 * Réserve un mot pour l'annoncer : mise à jour conditionnelle et atomique (« seulement si
 * personne ne l'a déjà fait »). Deux passages simultanés ne peuvent pas réserver le même mot.
 */
async function reserver(payload: Payload, motId: string, maintenant: Date) {
  const mots = (payload.db as unknown as MongooseAdapter).collections.mots
  if (!mots) throw new Error('Collection mots introuvable')
  const { modifiedCount } = await mots.updateOne(
    { _id: motId, $or: [{ notifiedAt: { $exists: false } }, { notifiedAt: null }] },
    { $set: { notifiedAt: maintenant } },
  )
  return modifiedCount === 1
}

/**
 * Tâche de chaque minute : chaque mot arrivé à son heure est réservé (notifiedAt rempli),
 * puis annoncé, un message par destinataire et par auteur.
 * Renvoie le nombre de mots annoncés.
 */
export async function notifierMotsOuvrables(payload: Payload, maintenant = new Date()) {
  const { docs } = await payload.find({
    collection: 'mots',
    where: {
      and: [
        { statut: { equals: 'programme' } },
        { mode: { in: ['date', 'semaine_hasard'] } },
        { unlockAt: { less_than_equal: maintenant.toISOString() } },
        { notifiedAt: { exists: false } },
      ],
    },
    depth: 0,
    limit: 500,
  })
  const reserves: { auteur: string; destinataire: string }[] = []
  for (const mot of docs) {
    if (!(await reserver(payload, mot.id, maintenant))) continue
    const recent = maintenant.getTime() - new Date(mot.unlockAt ?? 0).getTime() <= RATTRAPAGE_MS
    const auteur = idDe(mot.auteur)
    const destinataire = idDe(mot.destinataire)
    if (recent && auteur && destinataire) reserves.push({ auteur, destinataire })
  }

  const groupes = new Map<string, { auteur: string; destinataire: string; nombre: number }>()
  for (const r of reserves) {
    const cle = `${r.destinataire}:${r.auteur}`
    const g = groupes.get(cle) ?? { ...r, nombre: 0 }
    g.nombre += 1
    groupes.set(cle, g)
  }
  for (const g of groupes.values()) {
    const auteur = await payload.findByID({ collection: 'users', id: g.auteur, depth: 0 })
    await notify(payload, g.destinataire, {
      type: 'mots_ouvrables',
      expediteur: auteur.prenom,
      nombre: g.nombre,
    })
  }
  return reserves.length
}

/**
 * Rappel doux : si moins de 2 mots datés ou « Dans la semaine » s'ouvrent dans les 7 jours,
 * une notification discrète à l'auteur, entre 18 h et 21 h chez lui, au plus une fois tous
 * les 7 jours, et jamais s'il l'a désactivé. Renvoie le nombre d'auteurs rappelés.
 */
export async function rappelerAuteurs(payload: Payload, maintenant = new Date()) {
  const { docs: auteurs } = await payload.find({
    collection: 'users',
    where: {
      and: [{ duo: { exists: true } }, { 'reglages.rappelDoux': { not_equals: false } }],
    },
    depth: 1,
    limit: 1000,
  })
  let rappeles = 0
  for (const auteur of auteurs) {
    const duo = typeof auteur.duo === 'object' ? auteur.duo : null
    if (!duo || duo.statut !== 'actif') continue
    const heure = heureLocale(maintenant, auteur.fuseauHoraire)
    if (heure < RAPPEL_DEBUT || heure >= RAPPEL_FIN) continue
    if (
      auteur.dernierRappelLe &&
      maintenant.getTime() - new Date(auteur.dernierRappelLe).getTime() < SEPT_JOURS_MS
    ) {
      continue
    }

    const { totalDocs } = await payload.count({
      collection: 'mots',
      where: {
        and: [
          { auteur: { equals: auteur.id } },
          { statut: { equals: 'programme' } },
          { mode: { in: ['date', 'semaine_hasard'] } },
          { unlockAt: { greater_than: maintenant.toISOString() } },
          {
            unlockAt: {
              less_than_equal: new Date(maintenant.getTime() + SEPT_JOURS_MS).toISOString(),
            },
          },
        ],
      },
    })
    if (totalDocs >= SEUIL_RAPPEL) continue

    const partenaireId = (duo.membres ?? []).map(idDe).find((id) => id && id !== auteur.id)
    if (!partenaireId) continue
    const partenaire = await payload.findByID({ collection: 'users', id: partenaireId, depth: 0 })
    await payload.update({
      collection: 'users',
      id: auteur.id,
      data: { dernierRappelLe: maintenant.toISOString() },
      depth: 0,
    })
    await notify(payload, auteur.id, { type: 'rappel_doux', destinataire: partenaire.prenom })
    rappeles += 1
  }
  return rappeles
}
