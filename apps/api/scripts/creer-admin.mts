/**
 * Crée le premier compte administrateur, sans passer par l'écran « premier utilisateur » de
 * l'admin (que n'importe qui pourrait atteindre sur une base de production neuve).
 *
 *   pnpm admin:creer         confirme la base visée, puis demande l'e-mail et le mot de passe
 *                            (masqué, saisi deux fois, 12 caractères au minimum)
 *   pnpm admin:creer --oui   sans confirmation de la base
 *
 * La base visée est DATABASE_URI (le .env est lu s'il existe, mais les variables du shell
 * passent avant). Il faut aussi PAYLOAD_SECRET. Refuse si la base a déjà un administrateur :
 * les comptes se gèrent alors dans l'admin.
 */
import 'dotenv/config'

import { getPayload } from 'payload'

import config from '../src/payload.config.ts'
import { annoncerBase, attendreBasePrete, creerSaisie, lancer } from './lib/cli.mts'

const LONGUEUR_MIN = 12
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

lancer(async () => {
  const saisie = creerSaisie()
  try {
    annoncerBase()
    if (!(await saisie.confirmer('Créer un compte administrateur dans cette base ?'))) {
      console.log('Création annulée.')
      return
    }

    const payload = await getPayload({ config })
    await attendreBasePrete(payload)
    const { totalDocs } = await payload.count({ collection: 'admins', overrideAccess: true })
    if (totalDocs > 0) {
      throw new Error(
        `cette base a déjà ${totalDocs} administrateur${totalDocs > 1 ? 's' : ''} : les comptes se gèrent dans l'admin.`,
      )
    }

    const email = (await saisie.demander('E-mail : ')).trim().toLowerCase()
    if (!EMAIL.test(email)) throw new Error('l’adresse e-mail n’est pas valide.')

    const motDePasse = await saisie.demander(
      `Mot de passe (${LONGUEUR_MIN} caractères minimum) : `,
      { masque: true },
    )
    if (motDePasse.length < LONGUEUR_MIN) {
      throw new Error(`le mot de passe doit faire au moins ${LONGUEUR_MIN} caractères.`)
    }
    if ((await saisie.demander('Mot de passe, à nouveau : ', { masque: true })) !== motDePasse) {
      throw new Error('les deux mots de passe ne correspondent pas.')
    }

    await payload.create({
      collection: 'admins',
      data: { email, password: motDePasse },
      overrideAccess: true,
    })
    console.log(`Compte administrateur créé : ${email}`)
  } finally {
    saisie.fermer()
  }
}, 'Compte non créé')
