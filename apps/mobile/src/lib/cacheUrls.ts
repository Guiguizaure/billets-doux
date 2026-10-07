/** Marge avant expiration : une URL qui expire dans moins de 30 s est redemandée. */
const MARGE_MS = 30_000

type Lecture = { url: string; expire: string }

/**
 * URL signées des médias, gardées pendant leur durée de validité : afficher dix fois la même
 * photo ne coûte qu'une demande à l'API. Deux demandes simultanées n'en font qu'une.
 */
export function creerCacheUrls(charger: (id: string) => Promise<Lecture>) {
  const valides = new Map<string, { url: string; expire: number }>()
  const enCours = new Map<string, Promise<string>>()

  return {
    /** L'URL si elle est encore bonne, sans rien demander. */
    immediate(id: string, maintenant = Date.now()) {
      const v = valides.get(id)
      return v && v.expire - maintenant > MARGE_MS ? v.url : null
    },
    async url(id: string, maintenant = Date.now()) {
      const deja = this.immediate(id, maintenant)
      if (deja) return deja
      const attente = enCours.get(id)
      if (attente) return attente
      const promesse = charger(id)
        .then((l) => {
          valides.set(id, { url: l.url, expire: new Date(l.expire).getTime() })
          return l.url
        })
        .finally(() => enCours.delete(id))
      enCours.set(id, promesse)
      return promesse
    },
  }
}
