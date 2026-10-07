// Après `next build` : le serveur autonome (.next/standalone) n'embarque pas les fichiers
// statiques (JS et CSS de l'admin). On les copie à côté de server.js, comme le demande Next.
// Next y recopie aussi les fichiers .env locaux : on les retire, la configuration ne vient que
// de l'environnement (Config Vars Heroku).
import { cpSync, existsSync, readdirSync, rmSync } from 'node:fs'

const source = '.next/static'
const cible = '.next/standalone/apps/api/.next/static'

if (!existsSync('.next/standalone/apps/api/server.js')) {
  console.error('Serveur autonome introuvable : `output: "standalone"` est-il actif ?')
  process.exit(1)
}
for (const fichier of readdirSync('.next/standalone/apps/api')) {
  if (fichier.startsWith('.env')) rmSync(`.next/standalone/apps/api/${fichier}`)
}
rmSync(cible, { recursive: true, force: true })
cpSync(source, cible, { recursive: true })
console.log('Serveur autonome prêt : .next/standalone/apps/api/server.js')
