import { Caveat_400Regular } from '@expo-google-fonts/caveat'
import { DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold } from '@expo-google-fonts/dm-sans'
import {
  InstrumentSerif_400Regular,
  InstrumentSerif_400Regular_Italic,
} from '@expo-google-fonts/instrument-serif'

/**
 * Polices chargées au démarrage avec `useFonts` (Expo Go et web).
 * Les clés sont les noms de famille à utiliser dans `fontFamily` ; une famille par graisse,
 * sans `fontWeight`, sinon Android retombe sur la police système.
 */
export const fichiersPolices = {
  InstrumentSerif_400Regular,
  InstrumentSerif_400Regular_Italic,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  Caveat_400Regular,
}

export const familles = {
  titre: 'InstrumentSerif_400Regular',
  titreItalique: 'InstrumentSerif_400Regular_Italic',
  corps: 'DMSans_400Regular',
  corpsMedium: 'DMSans_500Medium',
  corpsSemiBold: 'DMSans_600SemiBold',
  manuscrit: 'Caveat_400Regular',
} as const satisfies Record<string, keyof typeof fichiersPolices>
