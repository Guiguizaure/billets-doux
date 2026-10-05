import { formaterHeure } from '@billets-doux/shared'
import { router } from 'expo-router'

import { Bouton } from '@/components/Bouton'
import { DuoTimbres } from '@/components/DuoTimbres'
import { EcranProvisoire } from '@/components/EcranProvisoire'
import { LienTexte } from '@/components/LienTexte'
import { useSession } from '@/session/SessionProvider'

export default function NousDeux() {
  const { moi, deconnecter } = useSession()
  const prenom = moi?.utilisateur.prenom ?? ''
  const partenaire = moi?.duo?.partenaire?.prenom ?? ''
  const heure = formaterHeure(moi?.utilisateur.heureDecouverte ?? '08:00')
  return (
    <EcranProvisoire
      titre="Nous deux"
      etape="Réglages complets à l’étape 7"
      texte={`Tes mots s’ouvrent à ${heure}. Retrouvailles, pause et réglages arriveront ici.`}
    >
      <DuoTimbres moi={prenom} partenaire={partenaire} />
      <Bouton libelle="Se déconnecter" variante="secondaire" onPress={() => void deconnecter()} />
      {__DEV__ ? (
        <LienTexte libelle="Page de test (développement)" onPress={() => router.push('/lab')} />
      ) : null}
    </EcranProvisoire>
  )
}
