// Version web de production (Cloudflare Pages) : `pnpm --filter @billets-doux/mobile build:web`,
// dossier publié : apps/mobile/dist. L'adresse de l'API est figée au build : sans elle, l'appli
// chercherait l'API sur le port 3100 de la page, ce qui ne marche qu'en développement.
import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'

const api = process.env.EXPO_PUBLIC_API_URL
if (!api) {
  console.error(
    'EXPO_PUBLIC_API_URL est vide : renseigne-la dans les variables du projet Cloudflare Pages ' +
      '(production et préversions : https://api.billetsdoux.app).',
  )
  process.exit(1)
}
console.log(`Version web pour l'API ${api}`)
execSync('expo export --platform web --output-dir dist --clear', { stdio: 'inherit' })

// Sans 404.html, Pages renvoie index.html pour toute adresse inconnue : l'appli (une seule page)
// gère ses routes elle-même (/rejoindre?code=…, /confidentialite…).
if (existsSync('dist/404.html')) {
  console.error('dist/404.html empêcherait Pages de servir l’appli sur toutes les adresses.')
  process.exit(1)
}
