import '@/global.css'

import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { fichiersPolices } from '@/theme/polices'
import { couleurs } from '@/theme/tokens'

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const [policesChargees, erreurPolices] = useFonts(fichiersPolices)
  const pret = policesChargees || erreurPolices !== null

  useEffect(() => {
    if (pret) SplashScreen.hideAsync()
  }, [pret])

  if (!pret) return null

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: couleurs.fond.papier },
        }}
      />
    </SafeAreaProvider>
  )
}
