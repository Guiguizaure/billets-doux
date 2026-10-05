import { Tabs } from 'expo-router/js-tabs'

import { BarreOnglets } from '@/components/BarreOnglets'
import { couleurs } from '@/theme/tokens'

/** Les quatre onglets du duo, avec la barre dessinée dans le Figma. */
export default function Onglets() {
  return (
    <Tabs
      tabBar={(props) => <BarreOnglets {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: couleurs.fond.papier } }}
    >
      <Tabs.Screen name="pour-moi" options={{ title: 'Pour moi' }} />
      <Tabs.Screen name="pour-toi" options={{ title: 'Pour toi' }} />
      <Tabs.Screen name="souvenirs" options={{ title: 'Souvenirs' }} />
      <Tabs.Screen name="nous-deux" options={{ title: 'Nous deux' }} />
    </Tabs>
  )
}
