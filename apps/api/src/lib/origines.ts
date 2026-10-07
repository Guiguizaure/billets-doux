/**
 * Origines autorisées par l'API (CORS), lues dans CORS_ORIGINS (séparées par des virgules).
 * Une origine est exacte (`https://billetsdoux.app`) ou un motif avec un seul `*`, pour les
 * préversions Cloudflare Pages (`https://*.billets-doux.pages.dev`). Sans import d'alias :
 * utilisé par payload.config.ts.
 */

const echapper = (texte: string) => texte.replace(/[.+?^${}()|[\]\\]/g, '\\$&')

/** Le `*` couvre un ou plusieurs sous-domaines (lettres, chiffres, tirets, points). */
export function origineAutorisee(motifs: readonly string[], origine: string | null | undefined) {
  if (!origine) return false
  return motifs.some((motif) => {
    if (!motif.includes('*')) return motif === origine
    const [avant, apres] = motif.split('*') as [string, string]
    return new RegExp(`^${echapper(avant)}[a-z0-9.-]+${echapper(apres)}$`).test(origine)
  })
}

/**
 * Liste passée à Payload (`cors`), qui ne connaît que les origines exactes : il cherche
 * l'origine de la requête avec `indexOf`, que l'on fait reconnaître les motifs.
 */
export class OriginesAutorisees extends Array<string> {
  override indexOf(origine: string) {
    return origineAutorisee([...this], origine) ? 0 : -1
  }
}

export function lireOrigines(valeur: string | undefined) {
  const motifs = (valeur ?? '')
    .split(',')
    .map((origine) => origine.trim())
    .filter(Boolean)
  return {
    cors: OriginesAutorisees.from(motifs) as OriginesAutorisees,
    // Le contrôle CSRF de Payload (connexion par cookie, celle de l'admin) : origines exactes.
    csrf: motifs.filter((motif) => !motif.includes('*')),
  }
}
