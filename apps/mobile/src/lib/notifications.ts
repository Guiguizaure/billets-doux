import { DonneesNotification } from '@billets-doux/shared'
import Constants, { ExecutionEnvironment } from 'expo-constants'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import { router } from 'expo-router'
import { useEffect } from 'react'
import { Linking, Platform } from 'react-native'

import { api } from './client'
import { rituel } from './rituel'

/** Canal Android des notifications (le même nom côté API). */
const CANAL = 'mots'

/**
 * - `autorise` : l'appareil reçoit les notifications ;
 * - `a_demander` : la question peut (encore) être posée par le système ;
 * - `bloque` : refusé pour de bon, seuls les réglages du téléphone peuvent l'activer ;
 * - `indisponible` : web, émulateur ou Expo Go (pas de notification push).
 */
export type EtatNotifications = 'autorise' | 'a_demander' | 'bloque' | 'indisponible'

export const notificationsPossibles = true

const indisponible = () =>
  !Device.isDevice || Constants.executionEnvironment === ExecutionEnvironment.StoreClient

// Appli au premier plan : la notification s'affiche quand même (bandeau et liste).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

/** Android 13 : la question du système n'apparaît qu'une fois un canal créé. */
async function preparerCanal() {
  if (Platform.OS !== 'android') return
  await Notifications.setNotificationChannelAsync(CANAL, {
    name: 'Mots du jour',
    description: 'Quand un mot t’attend, et quand on te répond.',
    importance: Notifications.AndroidImportance.HIGH,
    lightColor: '#C8442C',
  })
}

export async function etatNotifications(): Promise<EtatNotifications> {
  if (indisponible()) return 'indisponible'
  const permission = await Notifications.getPermissionsAsync()
  if (permission.granted) return 'autorise'
  return permission.canAskAgain ? 'a_demander' : 'bloque'
}

const jetonDeCetAppareil = async () =>
  (
    await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId as string | undefined,
    })
  ).data

/** Enregistre cet appareil auprès de l'API (sans rien demander si ce n'est pas autorisé). */
export async function enregistrerCetAppareil() {
  try {
    if ((await etatNotifications()) !== 'autorise') return
    await preparerCanal()
    await api.enregistrerAppareil({
      jeton: await jetonDeCetAppareil(),
      plateforme: Platform.OS === 'ios' ? 'ios' : 'android',
    })
  } catch {
    // Pas de notification pour cette fois ; on réessaiera au prochain lancement.
  }
}

/** Pose la question du système (ou ouvre les réglages si elle a été refusée pour de bon). */
export async function demanderNotifications(): Promise<EtatNotifications> {
  const etat = await etatNotifications()
  if (etat === 'indisponible' || etat === 'autorise') {
    if (etat === 'autorise') await enregistrerCetAppareil()
    return etat
  }
  if (etat === 'bloque') {
    await Linking.openSettings()
    return etat
  }
  await preparerCanal()
  await Notifications.requestPermissionsAsync()
  const apres = await etatNotifications()
  if (apres === 'autorise') await enregistrerCetAppareil()
  return apres
}

/** À la déconnexion : cet appareil ne reçoit plus les notifications de ce compte. */
export async function retirerCetAppareil() {
  try {
    if ((await etatNotifications()) !== 'autorise') return
    await api.retirerAppareil(await jetonDeCetAppareil())
  } catch {
    // L'API retirera le jeton d'elle-même quand Expo le déclarera invalide.
  }
}

const dejaTraitees = new Set<string>()

/**
 * Toucher une notification ouvre l'écran qu'elle désigne (« Pour moi », le mot répondu…).
 * `pret` : la session est chargée et le duo formé (sinon on attend).
 */
export function useOuvertureDesNotifications(pret: boolean) {
  useEffect(() => {
    if (!pret) return
    const ouvrir = (reponse: Notifications.NotificationResponse | null) => {
      if (!reponse || reponse.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return
      const id = reponse.notification.request.identifier
      if (dejaTraitees.has(id)) return
      dejaTraitees.add(id)
      const donnees = DonneesNotification.safeParse(reponse.notification.request.content.data)
      if (!donnees.success) return
      if (donnees.data.rituel) rituel.reproposer()
      router.navigate(donnees.data.lien as Parameters<typeof router.navigate>[0])
    }
    // Appli lancée par le toucher, puis touchers pendant qu'elle tourne.
    ouvrir(Notifications.getLastNotificationResponse())
    const abonnement = Notifications.addNotificationResponseReceivedListener(ouvrir)
    return () => abonnement.remove()
  }, [pret])
}
