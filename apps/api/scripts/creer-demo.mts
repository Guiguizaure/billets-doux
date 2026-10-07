// Crée (ou remet à zéro) le duo de démo du portfolio. `pnpm demo:creer`.
// En production (étape 9), avec DEMO_MOT_DE_PASSE et les variables de la base et du stockage.
import 'dotenv/config'

import { getPayload } from 'payload'

import config from '../src/payload.config.ts'
import { creerDemo } from '../src/services/demo.ts'

const payload = await getPayload({ config })
const { mots } = await creerDemo(payload)
console.log(`Duo de démo prêt : ${mots} mots.`)
process.exit(0)
