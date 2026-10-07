// Vérifie la mise en ligne : `pnpm verifier:prod` (voir DEPLOIEMENT.md, étape 9).
//
//   pnpm verifier:prod                lectures seulement : API, version web, en-têtes, CORS
//   pnpm verifier:prod --avec-demo    en plus, un aller-retour avec R2 par le duo de démo
//                                     (ouvre puis ferme une session de démo : une écriture)
//
// Adresses : VERIF_API (https://api.billetsdoux.app), VERIF_WEB (https://billetsdoux.app) et
// VERIF_PREVERSION, une origine de préversion Pages (https://verification.billets-doux.pages.dev).
// Sortie : une ligne par contrôle, code 1 si l'un échoue.

const API = (process.env.VERIF_API ?? 'https://api.billetsdoux.app').replace(/\/$/, '')
const WEB = (process.env.VERIF_WEB ?? 'https://billetsdoux.app').replace(/\/$/, '')
const PREVERSION = process.env.VERIF_PREVERSION ?? 'https://verification.billets-doux.pages.dev'
const AVEC_DEMO = process.argv.includes('--avec-demo')

let echecs = 0
const resultat = (ok, intitule, detail = '') => {
  if (!ok) echecs++
  console.log(`${ok ? '✓' : '✗'} ${intitule}${detail ? `  (${detail})` : ''}`)
}
const controler = async (intitule, verification) => {
  try {
    const detail = await verification()
    resultat(true, intitule, typeof detail === 'string' ? detail : '')
  } catch (e) {
    resultat(false, intitule, e instanceof Error ? e.message : String(e))
  }
}
const exiger = (condition, message) => {
  if (!condition) throw new Error(message)
}
const entete = (reponse, nom) => reponse.headers.get(nom) ?? ''
const enHttps = (adresse) => adresse.startsWith('https://')

/** Une requête de pré-vérification CORS, comme celle du navigateur avant un POST. */
const preverification = (origine) =>
  fetch(`${API}/api/comptes/connexion`, {
    method: 'OPTIONS',
    headers: {
      Origin: origine,
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type',
    },
  })

console.log(`API : ${API}\nWeb : ${WEB}\n`)
console.log('— API')

await controler('santé : l’API répond et la base est joignable', async () => {
  const r = await fetch(`${API}/api/health`)
  const corps = await r.json().catch(() => null)
  exiger(r.status === 200 && corps?.ok === true && corps?.db === true, `HTTP ${r.status}`)
})

await controler('en-têtes : noindex, nosniff, pas de cadre, HSTS', async () => {
  const r = await fetch(`${API}/api/health`)
  exiger(entete(r, 'x-robots-tag').includes('noindex'), 'X-Robots-Tag absent')
  exiger(entete(r, 'x-content-type-options') === 'nosniff', 'X-Content-Type-Options absent')
  exiger(entete(r, 'x-frame-options') === 'DENY', 'X-Frame-Options absent')
  if (enHttps(API)) exiger(entete(r, 'strict-transport-security') !== '', 'HSTS absent')
})

await controler('robots.txt interdit tout', async () => {
  const texte = await (await fetch(`${API}/robots.txt`)).text()
  exiger(/Disallow:\s*\/\s*$/m.test(texte), 'pas de « Disallow: / »')
})

if (enHttps(API)) {
  await controler('http:// redirige vers https://', async () => {
    const r = await fetch(API.replace('https://', 'http://') + '/api/health', {
      redirect: 'manual',
    })
    exiger(
      r.status >= 300 && r.status < 400,
      `HTTP ${r.status} (Cloudflare : « Always Use HTTPS »)`,
    )
    exiger(entete(r, 'location').startsWith('https://'), 'redirection ailleurs qu’en https')
  })
}

await controler('CORS : la version web est autorisée', async () => {
  const r = await preverification(WEB)
  exiger(entete(r, 'access-control-allow-origin') === WEB, 'origine refusée (CORS_ORIGINS)')
})

await controler('CORS : une préversion Pages est autorisée', async () => {
  const r = await preverification(PREVERSION)
  exiger(entete(r, 'access-control-allow-origin') === PREVERSION, 'motif *.pages.dev absent')
})

await controler('CORS : une origine inconnue est refusée', async () => {
  const r = await preverification('https://pirate.example')
  exiger(entete(r, 'access-control-allow-origin') === '', 'origine inconnue acceptée')
})

await controler('admin : un compte administrateur existe', async () => {
  // Route de Payload : faux tant que l'écran « premier utilisateur » est ouvert à tous.
  const corps = await (await fetch(`${API}/api/admins/init`)).json()
  exiger(corps.initialized === true, 'aucun administrateur : lancer pnpm admin:creer')
})

await controler('invitation : un code inconnu donne une page claire', async () => {
  const r = await fetch(`${API}/rejoindre/INCONNU0000`)
  exiger(r.status === 200 && (await r.text()).includes('plus valable'), `HTTP ${r.status}`)
})

console.log('\n— Version web')

await controler('accueil', async () => {
  const r = await fetch(`${WEB}/`)
  exiger(r.status === 200 && entete(r, 'content-type').includes('text/html'), `HTTP ${r.status}`)
})

for (const chemin of [
  '/rejoindre?code=LUNE1234',
  '/confidentialite',
  '/mentions-legales',
  '/supprimer-mon-compte',
  '/une/adresse/inconnue',
]) {
  await controler(`l’appli répond sur ${chemin}`, async () => {
    const r = await fetch(`${WEB}${chemin}`)
    exiger(r.status === 200 && entete(r, 'content-type').includes('text/html'), `HTTP ${r.status}`)
  })
}

await controler('en-têtes : nosniff, cadre sur le même site, HSTS', async () => {
  const r = await fetch(`${WEB}/`)
  exiger(entete(r, 'x-content-type-options') === 'nosniff', 'X-Content-Type-Options absent')
  exiger(entete(r, 'x-frame-options') === 'SAMEORIGIN', 'X-Frame-Options absent')
  if (enHttps(WEB)) exiger(entete(r, 'strict-transport-security') !== '', 'HSTS absent')
})

await controler('/lab n’est pas indexée', async () => {
  const r = await fetch(`${WEB}/lab`)
  exiger(entete(r, 'x-robots-tag').includes('noindex'), 'X-Robots-Tag absent')
})

await controler('l’appli appelle cette API, et son code est gardé en cache', async () => {
  const html = await (await fetch(`${WEB}/`)).text()
  const script = html.match(/src="(\/_expo\/static\/js\/web\/[^"]+\.js)"/)?.[1]
  exiger(script, 'script de l’appli introuvable dans index.html')
  const r = await fetch(`${WEB}${script}`)
  exiger((await r.text()).includes(API), `${API} absente (EXPO_PUBLIC_API_URL de Pages)`)
  exiger(entete(r, 'cache-control').includes('immutable'), 'Cache-Control sans « immutable »')
})

if (enHttps(WEB)) {
  const www = WEB.replace('https://', 'https://www.')
  await controler('www redirige vers le domaine principal', async () => {
    const r = await fetch(`${www}/`, { redirect: 'manual' })
    exiger(r.status >= 300 && r.status < 400, `HTTP ${r.status}`)
    exiger(entete(r, 'location').startsWith(WEB), `vers ${entete(r, 'location') || '?'}`)
  })
}

if (AVEC_DEMO) {
  console.log('\n— Stockage (duo de démo)')
  let jeton = null
  const avecJeton = (chemin, init = {}) =>
    fetch(`${API}${chemin}`, {
      ...init,
      headers: { Authorization: `JWT ${jeton}`, ...(init.headers ?? {}) },
    })
  let url = null

  await controler('connexion au duo de démo', async () => {
    const r = await fetch(`${API}/api/comptes/demo`, { method: 'POST' })
    exiger(r.status === 200, `HTTP ${r.status} (pnpm demo:creer lancé ?)`)
    jeton = (await r.json()).jeton
  })

  if (jeton) {
    await controler('une photo de la démo s’obtient par une URL signée', async () => {
      const souvenirs = await (await avecJeton('/api/souvenirs')).json()
      const photo = souvenirs.mots?.find((m) => m.photo)?.photo
      exiger(photo, 'aucune photo dans les souvenirs de la démo')
      const lecture = await (await avecJeton(`/api/medias/${photo}/lecture`)).json()
      exiger(lecture.url, 'pas d’URL de lecture')
      url = lecture.url
      return new URL(url).host
    })
  }

  if (url) {
    await controler('le stockage sert la photo', async () => {
      const r = await fetch(url)
      exiger(r.status === 200 && entete(r, 'content-type').startsWith('image/'), `HTTP ${r.status}`)
    })
    await controler('CORS du stockage : la version web peut lire', async () => {
      const r = await fetch(url, { headers: { Origin: WEB } })
      exiger(entete(r, 'access-control-allow-origin') === WEB, 'règle CORS du bucket absente')
    })
  }

  if (jeton) {
    await controler('fermeture de la session de démo', async () => {
      const r = await avecJeton('/api/users/logout', { method: 'POST' })
      exiger(r.status === 200, `HTTP ${r.status}`)
    })
  }
}

console.log(echecs === 0 ? '\nTout est en ordre.' : `\n${echecs} contrôle(s) en échec.`)
process.exit(echecs === 0 ? 0 : 1)
