import { Redirect, Stack } from 'expo-router'

import { useSession } from '@/session/SessionProvider'
import { optionsPile } from '@/theme/navigation'

/** Écrans sans compte : dès qu'on est connecté, l'aiguillage reprend la main. */
export default function LayoutVisiteur() {
  const { phase } = useSession()
  if (phase !== 'visiteur') return <Redirect href="/" />
  return <Stack screenOptions={optionsPile} />
}
