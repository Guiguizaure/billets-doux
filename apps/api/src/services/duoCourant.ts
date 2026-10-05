import type { PayloadRequest } from 'payload'

import { ErreurMetier } from '@/lib/erreurs'
import { idDe } from '@/lib/ids'

/** Le duo actif (ou en pause) de l'utilisateur et l'identifiant de l'autre membre. */
export async function duoCourant(req: PayloadRequest, userId: string) {
  const user = await req.payload.findByID({ collection: 'users', id: userId, depth: 0, req })
  const duoId = idDe(user.duo)
  const duo = duoId
    ? await req.payload.findByID({ collection: 'duos', id: duoId, depth: 0, req })
    : null
  if (!duo || (duo.statut !== 'actif' && duo.statut !== 'pause')) {
    throw new ErreurMetier(409, 'Il faut un duo pour écrire.')
  }
  const partenaireId = duo.membres.map(idDe).find((id) => id && id !== userId)
  if (!partenaireId) throw new ErreurMetier(409, 'Il faut un duo pour écrire.')
  return { duo, partenaireId }
}
