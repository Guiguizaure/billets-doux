import type { Duo } from '@billets-doux/shared/payload-types'

/** Une invitation est valable tant que le duo attend et que le code n'a pas expiré. */
export function invitationValable(
  duo: Pick<Duo, 'statut' | 'codeExpireLe'>,
  maintenant = Date.now(),
) {
  return duo.statut === 'invitation' && new Date(duo.codeExpireLe).getTime() > maintenant
}
