import type { ResultatPartage } from './partage'

/**
 * Web : partage natif du navigateur s'il existe (mobile), sinon copie du lien.
 * Le presse-papiers n'est disponible qu'en HTTPS ou sur localhost : sur le réseau local
 * en HTTP, `copier` renvoie faux et l'écran affiche le code à recopier.
 */
export async function partager({
  message,
  lien,
}: {
  message: string
  lien: string
}): Promise<ResultatPartage> {
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: 'Billets doux', text: message })
      return 'partage'
    } catch {
      return 'annule'
    }
  }
  return (await copier(lien)) ? 'copie' : 'impossible'
}

export async function copier(texte: string) {
  try {
    if (!navigator.clipboard) return false
    await navigator.clipboard.writeText(texte)
    return true
  } catch {
    return false
  }
}
