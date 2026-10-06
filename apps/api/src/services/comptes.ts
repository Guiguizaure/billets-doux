import {
  type Connexion,
  HEURE_PAR_DEFAUT,
  type Inscription,
  type MiseAJourCompte,
  type Moi,
  type Session,
  type VueDuo,
} from '@billets-doux/shared'
import type { Duo, User } from '@billets-doux/shared/payload-types'
import type { Payload, PayloadRequest } from 'payload'
import { AuthenticationError, LockedAuth, refreshOperation, ValidationError } from 'payload'

import { ErreurMetier } from '@/lib/erreurs'
import { fuseauValide } from '@/lib/fuseau'
import { idDe } from '@/lib/ids'

const COMPTE_EXISTANT = 'Un compte existe déjà avec cette adresse.'

export async function inscrire(payload: Payload, donnees: Inscription): Promise<Session> {
  if (!fuseauValide(donnees.fuseauHoraire)) {
    throw new ErreurMetier(400, 'Fuseau horaire inconnu.', {
      fuseauHoraire: 'Fuseau horaire inconnu.',
    })
  }
  const existants = await payload.count({
    collection: 'users',
    where: { email: { equals: donnees.email } },
  })
  if (existants.totalDocs > 0) {
    throw new ErreurMetier(409, COMPTE_EXISTANT, { email: COMPTE_EXISTANT })
  }
  try {
    await payload.create({
      collection: 'users',
      data: {
        email: donnees.email,
        password: donnees.motDePasse,
        prenom: donnees.prenom,
        fuseauHoraire: donnees.fuseauHoraire,
        heureDecouverte: HEURE_PAR_DEFAUT,
      },
    })
  } catch (e) {
    // Deux inscriptions simultanées : l'index unique sur l'e-mail tranche.
    if (e instanceof ValidationError && e.data.errors.some((err) => err.path === 'email')) {
      throw new ErreurMetier(409, COMPTE_EXISTANT, { email: COMPTE_EXISTANT })
    }
    throw e
  }
  return connecter(payload, { email: donnees.email, motDePasse: donnees.motDePasse })
}

export async function connecter(payload: Payload, donnees: Connexion): Promise<Session> {
  try {
    const resultat = await payload.login({
      collection: 'users',
      data: { email: donnees.email, password: donnees.motDePasse },
    })
    if (!resultat.token || !resultat.exp) throw new Error('Connexion sans jeton')
    return { jeton: resultat.token, expire: resultat.exp }
  } catch (e) {
    if (e instanceof LockedAuth) {
      throw new ErreurMetier(423, 'Trop d’essais : ton compte est bloqué pendant 10 minutes.')
    }
    if (e instanceof AuthenticationError) {
      throw new ErreurMetier(401, 'E-mail ou mot de passe incorrect.')
    }
    throw e
  }
}

/** Nouveau jeton pour la session en cours (appelé au lancement de l'appli). */
export async function rafraichir(req: PayloadRequest): Promise<Session> {
  const resultat = await refreshOperation({ collection: req.payload.collections.users, req })
  return { jeton: resultat.refreshedToken, expire: resultat.exp }
}

/** Ce que l'appli sait d'elle-même : son compte et une vue réduite de son duo. */
export async function vueMoi(req: PayloadRequest, userId: string, origine: string): Promise<Moi> {
  const { payload } = req
  const user = await payload.findByID({ collection: 'users', id: userId, depth: 0, req })

  let duo: VueDuo | null = null
  const duoId = idDe(user.duo)
  if (duoId) {
    const d = await payload.findByID({ collection: 'duos', id: duoId, depth: 0, req })
    const partenaireId = d.membres.map(idDe).find((id) => id && id !== userId)
    // L'autre a pu supprimer son compte (le duo est alors fermé).
    const partenaire = partenaireId
      ? await payload
          .findByID({ collection: 'users', id: partenaireId, depth: 0, req })
          .catch(() => null)
      : null
    duo = {
      id: d.id,
      statut: d.statut,
      retrouvailles: d.retrouvailles ?? null,
      pause: await vuePause(req, d, userId),
      invitation:
        d.statut === 'invitation' && idDe(d.createur) === userId
          ? { code: d.code, expireLe: d.codeExpireLe, lien: `${origine}/rejoindre/${d.code}` }
          : null,
      partenaire: partenaire ? { prenom: partenaire.prenom } : null,
    }
  }

  return {
    utilisateur: {
      id: user.id,
      prenom: user.prenom,
      email: user.email,
      fuseauHoraire: user.fuseauHoraire,
      heureDecouverte: user.heureDecouverte,
      heureConfirmee: Boolean(user.heureConfirmee),
      demo: Boolean(user.demo),
      reglages: {
        rappelDoux: user.reglages?.rappelDoux !== false,
        indicesVisibles: user.reglages?.indicesVisibles !== false,
      },
    },
    duo,
  }
}

export async function mettreAJour(req: PayloadRequest, userId: string, donnees: MiseAJourCompte) {
  const data: Partial<User> = {}
  if (donnees.heureDecouverte) {
    data.heureDecouverte = donnees.heureDecouverte
    data.heureConfirmee = true
  }
  if (donnees.fuseauHoraire) {
    if (!fuseauValide(donnees.fuseauHoraire)) throw new ErreurMetier(400, 'Fuseau horaire inconnu.')
    const user = await req.payload.findByID({ collection: 'users', id: userId, depth: 0, req })
    // Le duo de démo garde son fuseau, d'où que vienne le visiteur.
    if (!user.demo) data.fuseauHoraire = donnees.fuseauHoraire
  }
  if (donnees.reglages) {
    const user = await req.payload.findByID({ collection: 'users', id: userId, depth: 0, req })
    data.reglages = { ...user.reglages, ...donnees.reglages }
  }
  // Le hook de users recalcule les ouvertures si l'heure ou le fuseau change.
  if (Object.keys(data).length > 0) {
    await req.payload.update({ collection: 'users', id: userId, data, req })
  }
}

/** Qui a mis le duo en pause, et depuis quand (null s'il n'est pas en pause). */
export async function vuePause(req: PayloadRequest, duo: Duo, userId: string) {
  const parId = idDe(duo.pausePar)
  if (duo.statut !== 'pause' || !parId) return null
  const par = await req.payload
    .findByID({ collection: 'users', id: parId, depth: 0, req })
    .catch(() => null)
  return {
    parMoi: parId === userId,
    prenom: par?.prenom ?? '',
    depuis: duo.pauseDepuis ?? '',
  }
}
