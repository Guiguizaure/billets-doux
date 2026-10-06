import { router } from 'expo-router'

import { EcranSouvenirs } from '@/components/EcranSouvenirs'
import { EnTete } from '@/components/EnTete'

const revenir = () => (router.canGoBack() ? router.back() : router.replace('/'))

/** Les souvenirs restent accessibles sans duo (après une fermeture), avec l'export. */
export default function MesSouvenirs() {
  return <EcranSouvenirs enTete={<EnTete titre="Mes souvenirs" retour={revenir} />} avecExport />
}
