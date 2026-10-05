import { formaterHeure } from '@billets-doux/shared'

import { EcranProvisoire } from '@/components/EcranProvisoire'
import { useSession } from '@/session/SessionProvider'

export default function PourMoi() {
  const { moi } = useSession()
  const partenaire = moi?.duo?.partenaire?.prenom ?? 'Ta personne'
  const heure = formaterHeure(moi?.utilisateur.heureDecouverte ?? '08:00')
  return (
    <EcranProvisoire
      titre="Pour moi"
      etape="Arrive à l’étape 5"
      texte={`Ton calendrier : les mots que ${partenaire} te prépare s’ouvriront ici, chaque jour à ${heure}.`}
    />
  )
}
