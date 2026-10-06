import * as Haptics from 'expo-haptics'
import { Platform } from 'react-native'

const surTelephone = Platform.OS !== 'web'

/** Retours tactiles (choix validé à l'étape 8). Rien sur le web : pas de vibreur. */
export const vibrer = {
  /** Le cachet se brise (rituel 2.3). */
  cachet: () => {
    if (surTelephone) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
  },
  /** Une réaction choisie. */
  reaction: () => {
    if (surTelephone) void Haptics.selectionAsync()
  },
  /** Un mot programmé. */
  programme: () => {
    if (surTelephone) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
  },
}
