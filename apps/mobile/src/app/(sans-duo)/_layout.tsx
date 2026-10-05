import { Redirect, Stack } from 'expo-router'

import { useSession } from '@/session/SessionProvider'
import { couleurs } from '@/theme/tokens'

/** Connecté mais sans duo actif : inviter sa personne. */
export default function LayoutSansDuo() {
  const { phase } = useSession()
  if (phase !== 'sansDuo') return <Redirect href="/" />
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: couleurs.fond.papier },
      }}
    />
  )
}
