import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import {
  ajouterJours,
  instantOuverture,
  jourLocal,
  type Reaction,
  semaineAuHasard,
  type TypeMot,
} from '@billets-doux/shared'
import type { Mot as MotDoc } from '@billets-doux/shared/payload-types'
import type { Payload } from 'payload'

import { genererCode } from '@/lib/codes'
import { ErreurMetier } from '@/lib/erreurs'
import { deposerFichier, supprimerPrefixe } from '@/lib/stockage'

/**
 * Le duo de démo (portfolio) : Léo, le visiteur, et Lina. Pas besoin de créer deux comptes
 * pour voir l'appli : un bouton connecte au compte de Léo, déjà rempli des deux côtés.
 * Rien d'irréversible n'y est permis, et tout est recréé chaque nuit.
 */
export const DEMO = {
  visiteur: { email: 'demo-leo@billets-doux.app', prenom: 'Léo' },
  partenaire: { email: 'demo-lina@billets-doux.app', prenom: 'Lina' },
  fuseau: 'Europe/Paris',
  heure: '08:00',
} as const

const motDePasse = () => {
  const valeur = process.env.DEMO_MOT_DE_PASSE
  if (!valeur) throw new ErreurMetier(404, 'Pas de duo de démo sur ce serveur.')
  return valeur
}

/** Connexion au compte de démo du visiteur, sans mot de passe à saisir. */
export async function connexionDemo(payload: Payload) {
  const resultat = await payload
    .login({
      collection: 'users',
      data: { email: DEMO.visiteur.email, password: motDePasse() },
    })
    .catch(() => {
      throw new ErreurMetier(404, 'Le duo de démo n’est pas prêt.')
    })
  if (!resultat.token || !resultat.exp) throw new Error('Connexion de démo sans jeton')
  return { jeton: resultat.token, expire: resultat.exp }
}

/** Refuse une action irréversible sur un compte de démo. */
export async function exigerHorsDemo(payload: Payload, userId: string, message: string) {
  const user = await payload.findByID({ collection: 'users', id: userId, depth: 0 })
  if (user.demo) throw new ErreurMetier(403, message)
}

/** Les médias de la démo, rangés avec le code de l'API. */
function fichierDemo(nom: string) {
  const candidats = [
    path.resolve(process.cwd(), 'src/demo/medias', nom),
    path.resolve(process.cwd(), 'apps/api/src/demo/medias', nom),
  ]
  const trouve = candidats.find((c) => existsSync(c))
  if (!trouve) throw new Error(`Média de démo introuvable : ${nom}`)
  return new Uint8Array(readFileSync(trouve))
}

type Mot = {
  auteur: string
  destinataire: string
  type: TypeMot
  texte: string
  manuscrit?: boolean
  indice?: string
  photo?: string
  vocal?: string
  /** Jour d'ouverture, relatif à aujourd'hui (−6 : il y a six jours). */
  jour?: number
  /** Semaine au hasard (« Dans la semaine »). */
  surprise?: boolean
  ouvreQuand?: string
  /** Brouillon, dans la réserve. */
  brouillon?: boolean
  /** Ouvert : il y a `ouvert` jours (0 : aujourd'hui). */
  ouvert?: number
  joker?: boolean
  reaction?: Reaction
  reponse?: string
}

/**
 * Crée le duo de démo, ou le remet à zéro à l'identique (tâche de chaque nuit, et script
 * `pnpm demo:creer` lancé une fois en production). Les dates suivent le jour même.
 */
export async function creerDemo(payload: Payload, maintenant = new Date()) {
  const mdp = motDePasse()
  const aujourdhui = jourLocal(maintenant, DEMO.fuseau)
  const jour = (n: number) => ajouterJours(aujourdhui, n)
  const instant = (n: number) => instantOuverture(jour(n), DEMO.heure, DEMO.fuseau)

  // 1. Les deux comptes, vidés de tout ce qu'ils contenaient.
  const ids: Record<'visiteur' | 'partenaire', string> = { visiteur: '', partenaire: '' }
  for (const role of ['visiteur', 'partenaire'] as const) {
    const { email, prenom } = DEMO[role]
    const { docs } = await payload.find({
      collection: 'users',
      where: { email: { equals: email } },
      depth: 0,
      limit: 1,
    })
    const donnees = {
      prenom,
      fuseauHoraire: DEMO.fuseau,
      heureDecouverte: DEMO.heure,
      heureConfirmee: true,
      reglages: { rappelDoux: true, indicesVisibles: true },
      appareils: [],
      dernierJokerLe: null,
      dernierRappelLe: null,
      duo: null,
      demo: role,
      password: mdp,
    }
    const existant = docs[0]
    ids[role] = existant
      ? (await payload.update({ collection: 'users', id: existant.id, data: donnees })).id
      : (await payload.create({ collection: 'users', data: { email, ...donnees } })).id
  }
  const membres = [ids.partenaire, ids.visiteur]
  // Les hooks des mots emportent leurs médias et leurs réponses.
  await payload.delete({ collection: 'mots', where: { auteur: { in: membres } } })
  await payload.delete({ collection: 'reponses', where: { auteur: { in: membres } } })
  await payload.delete({ collection: 'medias', where: { proprietaire: { in: membres } } })
  await payload.delete({ collection: 'envois-push', where: { utilisateur: { in: membres } } })
  for (const id of membres)
    await payload.delete({ collection: 'duos', where: { membres: { contains: id } } })
  for (const id of membres) await supprimerPrefixe(`exports/${id}/`)
  await supprimerPrefixe('demo/')

  // 2. Le duo, formé il y a trois semaines, avec des retrouvailles dans douze jours.
  const duo = await payload.create({
    collection: 'duos',
    data: {
      membres,
      createur: ids.partenaire,
      statut: 'actif',
      code: `DEMO${genererCode().replace(/\D/g, '').padStart(4, '0').slice(-4)}`,
      codeExpireLe: maintenant.toISOString(),
      rejointLe: instant(-21).toISOString(),
      retrouvailles: jour(12),
      rythmes: membres.map((membre) => ({ membre, rythme: 'jour' as const })),
    },
  })
  for (const id of membres) await payload.update({ collection: 'users', id, data: { duo: duo.id } })

  // 3. Les photos et le vocal (une copie par mot : un média n'appartient qu'à un mot).
  let rang = 0
  const media = async (proprietaire: string, nom: string, nature: 'photo' | 'vocal') => {
    const octets = fichierDemo(nom)
    const mime = nature === 'photo' ? 'image/jpeg' : 'audio/mp4'
    const cle = `demo/${duo.id}/${++rang}-${nom}`
    await deposerFichier(cle, octets, mime)
    const doc = await payload.create({
      collection: 'medias',
      data: {
        proprietaire,
        duo: duo.id,
        nature,
        cle,
        mime,
        taille: octets.length,
        ...(nature === 'vocal' ? { duree: 14 } : {}),
        statut: 'pret',
      },
    })
    return doc.id
  }

  const lina = ids.partenaire
  const leo = ids.visiteur
  const semaine = semaineAuHasard(maintenant, DEMO.fuseau)

  // 4. Les mots, des deux côtés.
  const mots: Mot[] = [
    // Lina → Léo : ouverts (souvenirs), à ouvrir aujourd'hui, scellés, surprise, lettres.
    {
      auteur: lina,
      destinataire: leo,
      type: 'poeme',
      texte:
        'Je t’ai gardé un bout de ciel,\nplié en quatre dans ma poche.\nOuvre-le doucement ce matin :\nil sent encore un peu la mer.',
      jour: -6,
      ouvert: 6,
      reaction: 'coeur',
      reponse: 'Il sent la mer, et un peu toi aussi.',
    },
    {
      auteur: lina,
      destinataire: leo,
      type: 'photo',
      texte: 'la crique, le jour où tu as perdu ta tong',
      photo: await media(lina, 'crique.jpg', 'photo'),
      jour: -4,
      ouvert: 4,
      reaction: 'etoile',
    },
    {
      auteur: lina,
      destinataire: leo,
      type: 'vocal',
      texte: 'fredonnée dans la cuisine, pardon pour le bruit',
      vocal: await media(lina, 'chanson.m4a', 'vocal'),
      jour: -2,
      ouvert: 2,
      reaction: 'lune',
    },
    {
      auteur: lina,
      destinataire: leo,
      type: 'mot',
      texte: 'Bonne chance pour ton oral. Respire, tu sais tout.',
      manuscrit: false,
      jour: -1,
      ouvert: 1,
    },
    {
      auteur: lina,
      destinataire: leo,
      type: 'mot',
      texte:
        'Ce matin, un héron sur le canal. Il avait l’air aussi pressé que toi un lundi. J’ai pensé à toi.',
      indice: 'Un oiseau très droit',
      jour: 0,
    },
    {
      auteur: lina,
      destinataire: leo,
      type: 'vocal',
      texte: 'La même, en mieux.',
      vocal: await media(lina, 'chanson.m4a', 'vocal'),
      indice: 'Une chanson que tu connais par cœur',
      jour: 1,
    },
    {
      auteur: lina,
      destinataire: leo,
      type: 'photo',
      texte: 'Il t’attend sur ma chaise.',
      photo: await media(lina, 'pull-jaune.jpg', 'photo'),
      indice: 'Quelque chose que tu as oublié chez moi',
      jour: 3,
    },
    {
      auteur: lina,
      destinataire: leo,
      type: 'poeme',
      texte: 'Dans cinq jours,\nla moitié du chemin.\nJe compte à l’envers,\ncomme une fusée.',
      jour: 5,
    },
    {
      auteur: lina,
      destinataire: leo,
      type: 'mot',
      texte: 'Surprise ! Tu ne savais pas quand.',
      surprise: true,
    },
    {
      auteur: lina,
      destinataire: leo,
      type: 'mot',
      texte: 'Respire. Compte les étoiles que tu ne vois pas. Je suis là, même de loin.',
      ouvreQuand: '… tu n’arrives pas à dormir',
    },
    {
      auteur: lina,
      destinataire: leo,
      type: 'mot',
      texte: 'Souviens-toi du chat qui avait volé ton croissant. Voilà.',
      ouvreQuand: '… tu as besoin de rire',
      ouvert: 7,
    },
    // Léo → Lina : le côté « Pour toi » du visiteur.
    {
      auteur: leo,
      destinataire: lina,
      type: 'mot',
      texte: 'Mets ton pull jaune, il te va si bien.',
      jour: -5,
      ouvert: 5,
      reaction: 'lune',
      reponse: 'Je l’ai mis. Il te va mieux à toi.',
    },
    {
      auteur: leo,
      destinataire: lina,
      type: 'photo',
      texte: 'Ton pull, resté sur ma chaise.',
      photo: await media(leo, 'pull-jaune.jpg', 'photo'),
      jour: 2,
      ouvert: 3,
      joker: true,
      reaction: 'coeur',
    },
    { auteur: leo, destinataire: lina, type: 'mot', texte: 'Plus que dix jours.', jour: 2 },
    {
      auteur: leo,
      destinataire: lina,
      type: 'poeme',
      texte: 'Le train de vendredi\na déjà ma place à la fenêtre.',
      jour: 4,
    },
    {
      auteur: leo,
      destinataire: lina,
      type: 'mot',
      texte: 'Un mot au hasard de la semaine.',
      surprise: true,
    },
    {
      auteur: leo,
      destinataire: lina,
      type: 'mot',
      texte: 'Tu es bien plus forte que ce que tu crois. Relis ça demain matin.',
      ouvreQuand: '… tu doutes de toi',
    },
    {
      auteur: leo,
      destinataire: lina,
      type: 'mot',
      texte: 'Lui raconter le concert de samedi.',
      brouillon: true,
    },
    {
      auteur: leo,
      destinataire: lina,
      type: 'mot',
      texte: 'Idée : une photo du marché du dimanche.',
      brouillon: true,
    },
  ]

  for (const m of mots) {
    const ouvertLe = m.ouvert !== undefined ? instant(-m.ouvert) : null
    let programmation: Pick<MotDoc, 'mode'> & Partial<MotDoc>
    if (m.brouillon) {
      programmation = { mode: 'brouillon', statut: 'brouillon' }
    } else if (m.ouvreQuand) {
      programmation = { mode: 'ouvre_quand', titreOuvreQuand: m.ouvreQuand }
    } else if (m.surprise) {
      const tire = ajouterJours(semaine.debut, 3)
      programmation = {
        mode: 'semaine_hasard',
        jourOuverture: tire,
        semaineDebut: semaine.debut,
        semaineFin: semaine.fin,
        unlockAt: instantOuverture(tire, DEMO.heure, DEMO.fuseau).toISOString(),
      }
    } else {
      // Le mot du jour s'ouvre tout de suite, quelle que soit l'heure de la remise à zéro.
      const ouverture = m.jour === 0 && instant(0) > maintenant ? maintenant : instant(m.jour ?? 0)
      programmation = {
        mode: 'date',
        jourOuverture: jour(m.jour ?? 0),
        unlockAt: ouverture.toISOString(),
      }
    }
    const statut = m.brouillon ? 'brouillon' : ouvertLe ? 'ouvert' : 'programme'
    const mot = await payload.create({
      collection: 'mots',
      data: {
        duo: duo.id,
        auteur: m.auteur,
        destinataire: m.destinataire,
        type: m.type,
        texte: m.texte,
        manuscrit: m.manuscrit ?? true,
        indice: m.indice ?? null,
        photo: m.photo ?? null,
        vocal: m.vocal ?? null,
        ...programmation,
        statut,
        openedAt: ouvertLe?.toISOString() ?? null,
        ouvertAvecJoker: Boolean(m.joker),
        // Aucune notification : la démo n'a pas de téléphone.
        notifiedAt: maintenant.toISOString(),
      },
    })
    if (m.reaction || m.reponse) {
      await payload.create({
        collection: 'reponses',
        data: {
          mot: mot.id,
          auteur: m.destinataire,
          reaction: m.reaction ?? null,
          texte: m.reponse ?? null,
          envoyeeLe: m.reponse && ouvertLe ? ouvertLe.toISOString() : null,
        },
      })
    }
  }
  return { duo: duo.id, mots: mots.length }
}
