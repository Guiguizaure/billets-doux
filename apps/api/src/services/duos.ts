import { normaliserCode, FORMAT_CODE } from '@billets-doux/shared'
import type { Duo, User } from '@billets-doux/shared/payload-types'
import type { PayloadRequest } from 'payload'

import { genererCode } from '@/lib/codes'
import { ErreurMetier } from '@/lib/erreurs'
import { idDe } from '@/lib/ids'
import { enTransaction } from '@/lib/transaction'

const VALIDITE_CODE_MS = 7 * 24 * 60 * 60 * 1000
const MAX_ESSAIS = 5
const FENETRE_ESSAIS_MS = 15 * 60 * 1000

/** Un code faux ou expiré : compte dans la limite d'essais. */
class EssaiRate extends ErreurMetier {}

const enCours = (duo: Pick<Duo, 'statut'>) => duo.statut === 'actif' || duo.statut === 'pause'

async function duoDe(req: PayloadRequest, user: User) {
  const id = idDe(user.duo)
  return id ? req.payload.findByID({ collection: 'duos', id, depth: 0, req }) : null
}

async function codeLibre(req: PayloadRequest) {
  for (let essai = 0; essai < 10; essai++) {
    const code = genererCode()
    const { totalDocs } = await req.payload.count({
      collection: 'duos',
      where: { code: { equals: code } },
      req,
    })
    if (totalDocs === 0) return code
  }
  throw new Error('Impossible de trouver un code d’invitation libre')
}

const expiration = () => new Date(Date.now() + VALIDITE_CODE_MS).toISOString()

/**
 * Crée l'invitation de l'utilisateur, ou renvoie celle en cours (renouvelée si elle a expiré).
 * Refusé si l'utilisateur a déjà un duo actif ou en pause : le duo est exclusif.
 */
export async function inviter(req: PayloadRequest, userId: string) {
  return enTransaction(req, async () => {
    const { payload } = req
    const user = await payload.findByID({ collection: 'users', id: userId, depth: 0, req })
    const actuel = await duoDe(req, user)

    if (actuel && enCours(actuel)) throw new ErreurMetier(409, 'Tu as déjà un duo.')

    if (actuel?.statut === 'invitation' && idDe(actuel.createur) === userId) {
      if (new Date(actuel.codeExpireLe).getTime() <= Date.now()) {
        await payload.update({
          collection: 'duos',
          id: actuel.id,
          data: { code: await codeLibre(req), codeExpireLe: expiration() },
          req,
        })
      }
      return
    }

    const duo = await payload.create({
      collection: 'duos',
      data: {
        membres: [userId],
        createur: userId,
        statut: 'invitation',
        code: await codeLibre(req),
        codeExpireLe: expiration(),
        rythmes: [{ membre: userId, rythme: 'jour' }],
      },
      req,
    })
    await payload.update({ collection: 'users', id: userId, data: { duo: duo.id }, req })
  })
}

/**
 * Rejoint le duo correspondant au code. Tout est vérifié ici, dans une transaction :
 * code existant et non expiré, pas son propre code, aucun des deux déjà en duo.
 * Écrire sur les deux comptes et sur le duo sérialise les tentatives simultanées.
 */
export async function rejoindre(req: PayloadRequest, userId: string, saisie: string) {
  const { payload } = req
  const code = normaliserCode(saisie)
  const avant = await payload.findByID({ collection: 'users', id: userId, depth: 0, req })
  verifierEssais(avant)

  try {
    await enTransaction(req, async () => {
      const user = await payload.findByID({ collection: 'users', id: userId, depth: 0, req })
      const actuel = await duoDe(req, user)
      if (actuel && enCours(actuel)) throw new ErreurMetier(409, 'Tu as déjà un duo.')

      const invalide = 'Ce code ne correspond à aucune invitation. Vérifie-le avec ta personne.'
      if (!FORMAT_CODE.test(code)) throw new EssaiRate(404, invalide)
      const { docs } = await payload.find({
        collection: 'duos',
        where: { code: { equals: code } },
        limit: 1,
        depth: 0,
        req,
      })
      const duo = docs[0]
      if (!duo || duo.statut !== 'invitation') throw new EssaiRate(404, invalide)

      const createurId = idDe(duo.createur)
      if (!createurId) throw new EssaiRate(404, invalide)
      if (createurId === userId) {
        throw new ErreurMetier(400, 'C’est ton propre code : partage-le avec ta personne.')
      }
      if (new Date(duo.codeExpireLe).getTime() <= Date.now()) {
        throw new EssaiRate(
          410,
          'Ce code a expiré. Demande à ta personne de t’en envoyer un nouveau.',
        )
      }
      const createur = await payload.findByID({
        collection: 'users',
        id: createurId,
        depth: 0,
        req,
      })
      if (idDe(createur.duo) !== duo.id) {
        throw new ErreurMetier(410, 'Cette invitation n’est plus valable.')
      }

      // Une invitation que l'utilisateur avait lui-même lancée n'a plus lieu d'être.
      if (actuel?.statut === 'invitation') {
        await payload.delete({ collection: 'duos', id: actuel.id, req })
      }

      await payload.update({
        collection: 'duos',
        id: duo.id,
        data: {
          membres: [createurId, userId],
          statut: 'actif',
          rejointLe: new Date().toISOString(),
          rythmes: [
            ...(duo.rythmes ?? []).map((r) => ({
              membre: idDe(r.membre) ?? createurId,
              rythme: r.rythme,
            })),
            { membre: userId, rythme: 'jour' as const },
          ],
        },
        req,
      })
      await payload.update({
        collection: 'users',
        id: userId,
        data: { duo: duo.id, essaisCode: { nombre: 0, depuis: null } },
        req,
      })
      await payload.update({ collection: 'users', id: createurId, data: { duo: duo.id }, req })
    })
  } catch (e) {
    if (e instanceof EssaiRate) await compterEchec(req, avant)
    throw e
  }
}

function verifierEssais(user: User) {
  const { nombre, depuis } = user.essaisCode ?? {}
  if (!depuis || !nombre || nombre < MAX_ESSAIS) return
  const restant = new Date(depuis).getTime() + FENETRE_ESSAIS_MS - Date.now()
  if (restant > 0) {
    const minutes = Math.ceil(restant / 60_000)
    throw new ErreurMetier(
      429,
      `Trop d’essais. Réessaie dans ${minutes} minute${minutes > 1 ? 's' : ''}.`,
    )
  }
}

async function compterEchec(req: PayloadRequest, user: User) {
  const { nombre, depuis } = user.essaisCode ?? {}
  const dansLaFenetre = depuis && new Date(depuis).getTime() + FENETRE_ESSAIS_MS > Date.now()
  await req.payload.update({
    collection: 'users',
    id: user.id,
    data: {
      essaisCode: dansLaFenetre
        ? { nombre: (nombre ?? 0) + 1, depuis }
        : { nombre: 1, depuis: new Date().toISOString() },
    },
  })
}
