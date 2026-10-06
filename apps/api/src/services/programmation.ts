import {
  type CalendrierAuteur,
  dernierJourProgrammable,
  instantOuverture,
  jourLocal,
  libellesJour,
  type MotProgramme,
  premierJourProgrammable,
  type Programmation,
  type Rythme,
  semaineAuHasard,
  tirerJourDansLaSemaine,
  type VueProgrammation,
} from '@billets-doux/shared'
import type { Mot, User } from '@billets-doux/shared/payload-types'
import type { PayloadRequest } from 'payload'

import { ErreurMetier } from '@/lib/erreurs'
import { idDe } from '@/lib/ids'

import { duoCourant } from './duoCourant'
import { motModifiable, vueMot } from './mots'
import { reponsesDe, vueReponse } from './reception'

const SANS_PROGRAMMATION = {
  jourOuverture: null,
  semaineDebut: null,
  semaineFin: null,
  unlockAt: null,
  titreOuvreQuand: null,
  // Nouvelle date : le mot sera annoncé à sa nouvelle heure.
  notifiedAt: null,
}

/**
 * Programme (ou reprogramme) un mot de l'auteur. Tout est calculé ici, jamais dans l'appli :
 * l'instant d'ouverture dépend de l'heure de découverte et du fuseau du destinataire.
 */
export async function programmer(
  req: PayloadRequest,
  userId: string,
  motId: string,
  programmation: Programmation,
  maintenant = new Date(),
): Promise<MotProgramme> {
  const mot = await motModifiable(req, userId, motId)
  const destinataire = await req.payload.findByID({
    collection: 'users',
    id: idDe(mot.destinataire) ?? '',
    depth: 0,
    req,
  })
  const { heureDecouverte: heure, fuseauHoraire: fuseau } = destinataire

  let donnees: Partial<Mot>
  switch (programmation.mode) {
    case 'date': {
      const premier = premierJourProgrammable(maintenant, heure, fuseau)
      if (programmation.jour < premier) {
        throw new ErreurMetier(
          400,
          `Ce jour est déjà passé pour ${destinataire.prenom} : choisis à partir du ${libellesJour(premier).long}.`,
        )
      }
      if (programmation.jour > dernierJourProgrammable(maintenant, fuseau)) {
        throw new ErreurMetier(400, 'Tu peux programmer un mot jusqu’à un an à l’avance.')
      }
      donnees = {
        ...SANS_PROGRAMMATION,
        jourOuverture: programmation.jour,
        unlockAt: instantOuverture(programmation.jour, heure, fuseau).toISOString(),
      }
      break
    }
    case 'semaine_hasard': {
      // Le jour est tiré ici et reste secret : l'auteur ne voit que la fenêtre.
      const { debut, fin } = semaineAuHasard(maintenant, fuseau)
      const jour = tirerJourDansLaSemaine(maintenant, fuseau)
      donnees = {
        ...SANS_PROGRAMMATION,
        jourOuverture: jour,
        semaineDebut: debut,
        semaineFin: fin,
        unlockAt: instantOuverture(jour, heure, fuseau).toISOString(),
      }
      break
    }
    case 'ouvre_quand':
      donnees = { ...SANS_PROGRAMMATION, titreOuvreQuand: programmation.titre }
      break
  }

  const programme = await req.payload.update({
    collection: 'mots',
    id: motId,
    data: { ...donnees, mode: programmation.mode, statut: 'programme' },
    depth: 1,
    req,
  })
  return vueProgramme(programme)
}

/** « Remettre dans la réserve » : le mot redevient un brouillon sans date. */
export async function remettreEnReserve(req: PayloadRequest, userId: string, motId: string) {
  const mot = await motModifiable(req, userId, motId)
  if (mot.statut !== 'programme') throw new ErreurMetier(409, 'Ce mot est déjà dans la réserve.')
  const brouillon = await req.payload.update({
    collection: 'mots',
    id: motId,
    data: { ...SANS_PROGRAMMATION, mode: 'brouillon', statut: 'brouillon' },
    depth: 1,
    req,
  })
  return vueMot(brouillon)
}

/** Le calendrier « Pour Lina » de l'auteur : ses mots programmés ou déjà ouverts. */
export async function calendrier(
  req: PayloadRequest,
  userId: string,
  maintenant = new Date(),
): Promise<CalendrierAuteur> {
  const { duo, partenaireId } = await duoCourant(req, userId)
  const destinataire = await req.payload.findByID({
    collection: 'users',
    id: partenaireId,
    depth: 0,
    req,
  })
  const [{ docs }, brouillons] = await Promise.all([
    req.payload.find({
      collection: 'mots',
      where: {
        and: [{ auteur: { equals: userId } }, { statut: { in: ['programme', 'ouvert'] } }],
      },
      sort: 'unlockAt',
      depth: 1,
      limit: 1000,
      req,
    }),
    req.payload.count({
      collection: 'mots',
      where: { and: [{ auteur: { equals: userId } }, { statut: { equals: 'brouillon' } }] },
      req,
    }),
  ])
  const reponses = await reponsesDe(
    req,
    docs.filter((m) => m.statut === 'ouvert').map((m) => m.id),
  )
  const rythme = duo.rythmes?.find((r) => idDe(r.membre) === userId)?.rythme ?? ('jour' as Rythme)
  return {
    rythme,
    destinataire: {
      prenom: destinataire.prenom,
      heureDecouverte: destinataire.heureDecouverte,
      fuseauHoraire: destinataire.fuseauHoraire,
    },
    aujourdhui: jourLocal(maintenant, destinataire.fuseauHoraire),
    premierJour: premierJourProgrammable(
      maintenant,
      destinataire.heureDecouverte,
      destinataire.fuseauHoraire,
    ),
    dernierJour: dernierJourProgrammable(maintenant, destinataire.fuseauHoraire),
    mots: docs.map((mot) => {
      const reponse = reponses.get(mot.id)
      return { ...vueProgramme(mot), reponse: reponse ? vueReponse(reponse) : null }
    }),
    brouillons: brouillons.totalDocs,
  }
}

/** Le rythme du calendrier de l'auteur (jour, semaine, mois) : il décide des cases affichées. */
export async function changerRythme(req: PayloadRequest, userId: string, rythme: Rythme) {
  const { duo } = await duoCourant(req, userId)
  const autres = (duo.rythmes ?? []).filter((r) => idDe(r.membre) !== userId)
  await req.payload.update({
    collection: 'duos',
    id: duo.id,
    data: {
      rythmes: [
        ...autres.map((r) => ({ membre: idDe(r.membre) ?? '', rythme: r.rythme })),
        { membre: userId, rythme },
      ],
    },
    req,
  })
}

/**
 * Le destinataire a changé d'heure de découverte ou de fuseau : ses mots programmés et pas
 * encore ouverts s'ouvriront le même jour, à la nouvelle heure. Si ce nouvel instant est déjà
 * passé (heure avancée après son passage aujourd'hui), le mot s'ouvre tout de suite :
 * on ne le décale pas au lendemain.
 */
export async function recalculerOuvertures(req: PayloadRequest, destinataire: User) {
  const { docs } = await req.payload.find({
    collection: 'mots',
    where: {
      and: [
        { destinataire: { equals: destinataire.id } },
        { statut: { equals: 'programme' } },
        { mode: { in: ['date', 'semaine_hasard'] } },
      ],
    },
    depth: 0,
    limit: 1000,
    req,
  })
  for (const mot of docs) {
    if (!mot.jourOuverture) continue
    const unlockAt = instantOuverture(
      mot.jourOuverture,
      destinataire.heureDecouverte,
      destinataire.fuseauHoraire,
    ).toISOString()
    if (unlockAt !== mot.unlockAt) {
      await req.payload.update({
        collection: 'mots',
        id: mot.id,
        data: { unlockAt, notifiedAt: null },
        req,
      })
    }
  }
  return docs.length
}

/** Vue auteur d'un mot programmé : jamais le jour tiré d'un mot « Dans la semaine ». */
export function vueProgramme(mot: Mot): MotProgramme {
  return {
    ...vueMot(mot),
    programmation: vueProgrammation(mot),
    ouvertLe: mot.openedAt ?? null,
    ouvertAvecJoker: Boolean(mot.ouvertAvecJoker),
    reponse: null,
  }
}

function vueProgrammation(mot: Mot): VueProgrammation {
  switch (mot.mode) {
    case 'date':
      return { mode: 'date', jour: mot.jourOuverture ?? '', unlockAt: mot.unlockAt ?? '' }
    case 'semaine_hasard':
      return { mode: 'semaine_hasard', debut: mot.semaineDebut ?? '', fin: mot.semaineFin ?? '' }
    case 'ouvre_quand':
      return { mode: 'ouvre_quand', titre: mot.titreOuvreQuand ?? '' }
    default:
      throw new Error(`Mot ${mot.id} sans programmation`)
  }
}
