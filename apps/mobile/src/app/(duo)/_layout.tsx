import { Redirect, Stack } from 'expo-router'

import { useSession } from '@/session/SessionProvider'
import { optionsPile } from '@/theme/navigation'

/** Duo formé : choix de l'heure (1.3), puis les onglets. */
export default function LayoutDuo() {
  const { phase } = useSession()
  // Pendant le chargement de la session, on attend : un lien profond ne doit pas être perdu.
  if (phase === 'chargement') return null
  if (phase !== 'duo') return <Redirect href="/" />
  return <Stack screenOptions={optionsPile} />
}
