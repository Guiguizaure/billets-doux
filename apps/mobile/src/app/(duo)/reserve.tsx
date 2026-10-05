import { formaterDuree, type VueMotAuteur } from '@billets-doux/shared'
import { router, useFocusEffect } from 'expo-router'
import { useCallback, useRef, useState } from 'react'
import { AccessibilityInfo, ActivityIndicator, StyleSheet, View } from 'react-native'

import Photo from '@/assets/icons/Photo.svg'
import Plume from '@/assets/icons/Plume.svg'
import Plus from '@/assets/icons/Plus.svg'
import Vocal from '@/assets/icons/Vocal.svg'
import { Alerte } from '@/components/Alerte'
import { BoutonRondAction } from '@/components/BoutonRondAction'
import { CarteBrouillon } from '@/components/CarteBrouillon'
import { Ecran } from '@/components/Ecran'
import { EnTete } from '@/components/EnTete'
import { Texte } from '@/components/Texte'
import { api } from '@/lib/client'
import { choisirSourcePhoto } from '@/lib/dialogue'
import { enregistrementPossible, useEnregistreur } from '@/lib/enregistreur'
import { messageErreur } from '@/lib/formulaires'
import { choisirPhoto, PermissionRefusee } from '@/lib/photo'
import { televerser } from '@/lib/televersement'
import { couleurs, rayons } from '@/theme/tokens'

/** Un vocal plus court ne vaut pas la peine d'être rangé (appui maintenu par erreur). */
const VOCAL_MINIMUM_S = 1

/** Écran 3.2 La réserve « quand j'y pense ». */
export default function Reserve() {
  const [mots, setMots] = useState<VueMotAuteur[] | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [annonce, setAnnonce] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState<string | null>(null)
  const enregistreur = useEnregistreur()
  /** Le doigt est-il encore posé sur le micro ? (il peut se lever pendant la demande d'accès) */
  const appuye = useRef(false)

  const charger = useCallback(async () => {
    try {
      setMots((await api.reserve()).mots)
      setErreur(null)
    } catch (e) {
      setErreur(messageErreur(e))
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      void charger()
    }, [charger]),
  )

  const annoncer = (message: string) => {
    setAnnonce(message)
    AccessibilityInfo.announceForAccessibility(message)
  }

  const commencerVocal = async () => {
    appuye.current = true
    setAnnonce(null)
    const resultat = await enregistreur.demarrer()
    // Doigt levé pendant la demande d'accès au micro : on n'enregistre pas dans le vide.
    if (resultat === 'demarre' && !appuye.current) {
      await enregistreur.arreter()
      annoncer('Maintiens le bouton pour enregistrer.')
    }
    if (resultat === 'refuse') {
      annoncer('Autorise le micro dans les réglages du téléphone pour enregistrer.')
    }
  }

  const rangerVocal = async () => {
    appuye.current = false
    if (enregistreur.etat !== 'enregistrement') return
    const resultat = await enregistreur.arreter()
    if (!resultat) return
    const { uri, duree } = resultat
    if (!uri || duree < VOCAL_MINIMUM_S) {
      annoncer('Maintiens un peu plus longtemps pour enregistrer.')
      return
    }
    setEnvoi('Envoi du vocal…')
    try {
      const vocal = await televerser({ nature: 'vocal', uri, duree }, (p) =>
        setEnvoi(`Envoi du vocal… ${Math.round(p * 100)} %`),
      )
      await api.creerBrouillon({ type: 'vocal', vocal: vocal.id })
      annoncer(`Vocal de ${formaterDuree(duree)} rangé dans la réserve.`)
      await charger()
    } catch (e) {
      setErreur(messageErreur(e))
    } finally {
      setEnvoi(null)
    }
  }

  const ajouterPhoto = async () => {
    const source = await choisirSourcePhoto()
    if (!source) return
    try {
      const photo = await choisirPhoto(source)
      if (!photo) return
      setEnvoi('Envoi de la photo…')
      const media = await televerser({ nature: 'photo', uri: photo.uri }, (p) =>
        setEnvoi(`Envoi de la photo… ${Math.round(p * 100)} %`),
      )
      await api.creerBrouillon({ type: 'photo', photo: media.id })
      annoncer('Photo rangée dans la réserve.')
      await charger()
    } catch (e) {
      setErreur(
        e instanceof PermissionRefusee
          ? 'Autorise l’appareil photo dans les réglages du téléphone.'
          : messageErreur(e),
      )
    } finally {
      setEnvoi(null)
    }
  }

  const enregistre = enregistreur.etat === 'enregistrement'

  return (
    <Ecran
      enTete={
        <EnTete
          titre="Réserve"
          retour={() => (router.canGoBack() ? router.back() : router.replace('/pour-toi'))}
          action={{ Icone: Plus, libelle: 'Nouveau mot', onPress: () => router.push('/ecrire') }}
        />
      }
      actions={
        <View style={styles.capture}>
          <BoutonRondAction
            Icone={Plume}
            libelle="Écrire un mot"
            legende="Écrire"
            tailleIcone={22}
            onPress={() => router.push('/ecrire')}
          />
          <BoutonRondAction
            Icone={Vocal}
            libelle="Enregistrer un vocal"
            accessibilityHint={
              enregistrementPossible
                ? 'Touche pour ouvrir l’enregistreur. Maintiens pour enregistrer directement dans la réserve.'
                : 'Ouvre l’enregistreur'
            }
            legende={
              enregistre
                ? `${formaterDuree(enregistreur.duree)} · relâche pour ranger`
                : 'Maintiens pour enregistrer'
            }
            taille={64}
            tailleIcone={28}
            variante="cachet"
            desactive={Boolean(envoi)}
            delayLongPress={250}
            onPress={() => router.push('/vocal')}
            onLongPress={enregistrementPossible ? () => void commencerVocal() : undefined}
            onPressOut={() => void rangerVocal()}
          />
          <BoutonRondAction
            Icone={Photo}
            libelle="Ajouter une photo"
            legende="Photo"
            tailleIcone={22}
            desactive={Boolean(envoi)}
            onPress={() => void ajouterPhoto()}
          />
        </View>
      }
    >
      <Texte variante="corpsS" couleur={couleurs.texte.encreDouce}>
        Tout ce que tu notes en passant. Tu le places dans le calendrier quand tu veux.
      </Texte>
      {erreur ? <Alerte message={erreur} /> : null}
      {envoi || annonce ? (
        <Texte variante="corpsS" style={styles.centre} accessibilityLiveRegion="polite">
          {envoi ?? annonce}
        </Texte>
      ) : null}
      {mots === null ? (
        <ActivityIndicator color={couleurs.texte.encre} />
      ) : mots.length === 0 ? (
        <View style={styles.vide}>
          <Texte variante="manuscritM" style={styles.centre}>
            Ta réserve est vide.
          </Texte>
          <Texte variante="corpsS" couleur={couleurs.texte.encreDouce} style={styles.centre}>
            Note une idée dès qu’elle vient : un mot, un vocal, une photo. Tu choisiras plus tard
            quand l’offrir.
          </Texte>
        </View>
      ) : (
        <View style={styles.liste}>
          {mots.map((mot) => (
            <CarteBrouillon
              key={mot.id}
              mot={mot}
              onPress={() => router.push({ pathname: '/ecrire', params: { id: mot.id } })}
            />
          ))}
        </View>
      )}
    </Ecran>
  )
}

const styles = StyleSheet.create({
  capture: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: couleurs.trait.ligne,
    backgroundColor: couleurs.fond.carte,
    boxShadow: '0px 8px 24px -6px rgba(41, 36, 69, 0.12)',
  },
  liste: {
    gap: 12,
  },
  vide: {
    gap: 8,
    paddingVertical: 32,
    paddingHorizontal: 12,
    borderRadius: rayons.carte,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: couleurs.trait.ligne,
  },
  centre: {
    textAlign: 'center',
  },
})
