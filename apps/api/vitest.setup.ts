// Charge .env (DATABASE_URI, PAYLOAD_SECRET), puis bascule sur une base dédiée aux tests :
// les tests vident leurs collections, ils ne doivent jamais toucher la base de dev.
import 'dotenv/config'

const uri = process.env.DATABASE_URI ?? ''
process.env.DATABASE_URI = uri.replace(/\/billets-doux(?=\?|$)/, '/billets-doux-test')
if (!process.env.DATABASE_URI.includes('/billets-doux-test')) {
  throw new Error('Tests : DATABASE_URI doit pointer vers la base locale billets-doux.')
}

// Médias : bucket dédié aux tests (créé par les tests eux-mêmes, cf. preparerBucket).
process.env.S3_BUCKET = 'billets-doux-medias-test'

// Les tâches planifiées ne tournent pas pendant les tests : on les appelle directement.
process.env.TACHES_DESACTIVEES = '1'
