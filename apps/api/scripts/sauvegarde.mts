/**
 * Sauvegardes de la base (dossier privé `sauvegardes/` du bucket). La tâche de la nuit en fait
 * une chaque jour à 3 h 30 UTC et garde les 14 dernières ; ces commandes servent à la main.
 *
 *   pnpm sauvegarde:faire                          une sauvegarde maintenant (ex. avant une
 *                                                  restauration)
 *   pnpm sauvegarde:restaurer --liste              les sauvegardes complètes, la plus récente
 *                                                  d'abord
 *   pnpm sauvegarde:restaurer <nom>                restaure dans une base vide
 *   pnpm sauvegarde:restaurer <nom> --remplacer    vide d'abord les collections de la base visée
 *   --oui                                          sans confirmation
 *
 * Base visée : DATABASE_URI ; stockage : S3_* (variables du shell, puis .env). Voir
 * DEPLOIEMENT.md. Une restauration remplace des données : fais d'abord `sauvegarde:faire`.
 */
import 'dotenv/config'

import { getPayload } from 'payload'

import config from '../src/payload.config.ts'
import {
  listerSauvegardes,
  lireManifeste,
  restaurer,
  sauvegarder,
} from '../src/services/sauvegarde.ts'
import {
  annoncerBase,
  attendreBasePrete,
  creerSaisie,
  exigerStockageCoherent,
  lancer,
} from './lib/cli.mts'

const [commande, ...reste] = process.argv.slice(2)
const nom = reste.find((a) => !a.startsWith('--'))
const remplacer = reste.includes('--remplacer')

lancer(async () => {
  const saisie = creerSaisie()
  try {
    annoncerBase()
    exigerStockageCoherent()
    console.log(`Stockage ciblé : bucket « ${process.env.S3_BUCKET ?? '(vide)'} »`)

    if (commande === 'faire') {
      if (!(await saisie.confirmer('Sauvegarder cette base maintenant ?'))) return
      const payload = await getPayload({ config })
      const resultat = await sauvegarder(payload)
      console.log(`Sauvegarde « ${resultat.nom} » :`, resultat.collections)
      if (resultat.supprimees.length)
        console.log('Supprimées (au-delà de 14) :', resultat.supprimees)
      return
    }

    if (commande !== 'restaurer') throw new Error('commande attendue : faire ou restaurer.')
    if (reste.includes('--liste') || !nom) {
      const { completes } = await listerSauvegardes()
      console.log(completes.length ? completes.join('\n') : 'Aucune sauvegarde complète.')
      if (!nom && !reste.includes('--liste')) console.log('\nIndique le nom de la sauvegarde.')
      return
    }

    const manifeste = await lireManifeste(nom)
    console.log(`Sauvegarde « ${nom} » (${manifeste.date}) :`, manifeste.collections)
    if (remplacer) console.log('--remplacer : les collections de la base visée seront vidées.')
    if (!(await saisie.confirmer('Restaurer cette sauvegarde dans cette base ?'))) {
      console.log('Rien n’a été modifié.')
      return
    }
    const payload = await getPayload({ config })
    await attendreBasePrete(payload)
    console.log('Restauré :', await restaurer(payload, nom, { remplacer }))
  } finally {
    saisie.fermer()
  }
}, 'Échec')
