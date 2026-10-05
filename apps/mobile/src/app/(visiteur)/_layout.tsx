import { Redirect, Stack } from 'expo-router'

import { useSession } from '@/session/SessionProvider'
import { optionsPile } from '@/theme/navigation'

/** Écrans sans compte : dès qu'on est connecté, l'aiguillage reprend la main. */
export default function LayoutVisiteur() {
  const { phase } = useSession()
  // Pendant le chargement de la session, on attend : un lien profond ne doit pas être perdu.
  if (phase === 'chargement') return null
  if (phase !== 'visiteur') return <Redirect href="/" />
  return <Stack screenOptions={optionsPile} />
}
