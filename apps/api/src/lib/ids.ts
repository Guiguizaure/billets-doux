/** Une relation Payload vaut soit l'identifiant, soit le document peuplé. */
export function idDe(valeur: string | { id: string } | null | undefined) {
  if (!valeur) return null
  return typeof valeur === 'string' ? valeur : valeur.id
}
