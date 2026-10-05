// Crée le bucket des médias et sa règle CORS (version web). `pnpm stockage:preparer`.
// En production (R2), à lancer une fois avec les identifiants de production.
import 'dotenv/config'

import { preparerBucket } from '../src/lib/stockage.ts'

const origines = (process.env.CORS_ORIGINS ?? '')
  .split(',')
  .map((origine) => origine.trim())
  .filter(Boolean)

const bucket = await preparerBucket(origines)
console.log(`Bucket « ${bucket} » prêt (CORS : ${origines.join(', ') || 'aucune origine'}).`)
