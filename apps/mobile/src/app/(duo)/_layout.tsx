import { Redirect, Stack } from 'expo-router'

import { useSession } from '@/session/SessionProvider'
import { couleurs } from '@/theme/tokens'

/** Duo formé : choix de l'heure (1.3), puis les onglets. */
export default function LayoutDuo() {
  const { phase } = useSession()
  if (phase !== 'duo') return <Redirect href="/" />
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: couleurs.fond.papier },
      }}
    />
  )
}
