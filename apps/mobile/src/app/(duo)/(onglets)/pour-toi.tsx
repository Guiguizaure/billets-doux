import { EcranProvisoire } from '@/components/EcranProvisoire'
import { useSession } from '@/session/SessionProvider'

export default function PourToi() {
  const { moi } = useSession()
  const partenaire = moi?.duo?.partenaire?.prenom ?? 'ta personne'
  return (
    <EcranProvisoire
      titre="Pour toi"
      etape="Arrive aux étapes 3 et 4"
      texte={`Le calendrier que tu prépares pour ${partenaire} : écrire, programmer, garder tes idées de côté.`}
    />
  )
}
