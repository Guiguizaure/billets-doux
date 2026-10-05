import { Redirect, Stack } from 'expo-router'

import { useSession } from '@/session/SessionProvider'
import { optionsPile } from '@/theme/navigation'

/** Connecté mais sans duo actif : inviter sa personne. */
export default function LayoutSansDuo() {
  const { phase } = useSession()
  // Pendant le chargement de la session, on attend : un lien profond ne doit pas être perdu.
  if (phase === 'chargement') return null
  if (phase !== 'sansDuo') return <Redirect href="/" />
  return <Stack screenOptions={optionsPile} />
}
