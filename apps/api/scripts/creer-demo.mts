/**
 * Crée (ou remet à zéro) le duo de démo du portfolio : Léo et Lina, remplis des deux côtés.
 *
 *   pnpm demo:creer          confirme la base visée, puis crée le duo
 *   pnpm demo:creer --oui    sans confirmation
 *
 * En production : DATABASE_URI, PAYLOAD_SECRET, DEMO_MOT_DE_PASSE et les variables du stockage
 * (les photos et le vocal de la démo y sont envoyés), tapées dans le shell (voir DEPLOIEMENT.md).
 * Ne touche qu'aux deux comptes de démo et à leur duo.
 */
import 'dotenv/config'

import { getPayload } from 'payload'

import config from '../src/payload.config.ts'
import { creerDemo } from '../src/services/demo.ts'
import { annoncerBase, attendreBasePrete, creerSaisie, lancer } from './lib/cli.mts'

lancer(async () => {
  const saisie = creerSaisie()
  try {
    annoncerBase()
    if (!process.env.DEMO_MOT_DE_PASSE) throw new Error('DEMO_MOT_DE_PASSE est vide.')
    console.log(`Stockage ciblé : bucket « ${process.env.S3_BUCKET ?? '(vide)'} »`)
    if (!(await saisie.confirmer('Créer (ou remettre à zéro) le duo de démo dans cette base ?'))) {
      console.log('Rien n’a été modifié.')
      return
    }
    const payload = await getPayload({ config })
    await attendreBasePrete(payload)
    const { mots } = await creerDemo(payload)
    console.log(`Duo de démo prêt : ${mots} mots.`)
  } finally {
    saisie.fermer()
  }
}, 'Duo de démo non créé')
