import { Redirect } from 'expo-router'

import { HorsLigne } from '@/components/HorsLigne'
import { useSession } from '@/session/SessionProvider'

/** Aiguillage : chaque phase de la session a son écran d'arrivée. */
export default function Aiguillage() {
  const { phase, moi, codeEnAttente } = useSession()

  switch (phase) {
    case 'chargement':
      return null
    case 'horsLigne':
      return <HorsLigne />
    case 'visiteur':
      return <Redirect href="/bienvenue" />
    case 'sansDuo':
      // Duo fermé : on le dit d'abord ; l'invitation suivante attend qu'on la demande.
      if (!codeEnAttente && moi?.duo?.statut === 'ferme') return <Redirect href="/duo-ferme" />
      return codeEnAttente ? (
        <Redirect href={{ pathname: '/rejoindre', params: { code: codeEnAttente } }} />
      ) : (
        <Redirect href="/inviter" />
      )
    case 'duo':
      if (!moi?.utilisateur.heureConfirmee) return <Redirect href="/heure" />
      // Puis le principe en trois cartes, une seule fois (pas pour la démo).
      return (
        <Redirect
          href={
            moi.utilisateur.tutoriel.cartesVues || moi.utilisateur.demo ? '/pour-moi' : '/principe'
          }
        />
      )
  }
}
