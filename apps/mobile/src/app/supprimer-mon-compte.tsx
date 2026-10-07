import { creerClient } from '@billets-doux/shared'
import { router } from 'expo-router'
import Head from 'expo-router/head'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'

import Corbeille from '@/assets/icons/Corbeille.svg'
import { Alerte } from '@/components/Alerte'
import { Bouton } from '@/components/Bouton'
import { BoutonVoir } from '@/components/BoutonVoir'
import { Champ } from '@/components/Champ'
import { useConfirmer } from '@/components/Dialogue'
import { Ecran } from '@/components/Ecran'
import { EnTete } from '@/components/EnTete'
import { LienTexte } from '@/components/LienTexte'
import { Texte } from '@/components/Texte'
import { apiUrl } from '@/lib/api'
import { messageErreur } from '@/lib/formulaires'
import { useSession } from '@/session/SessionProvider'
import { couleurs, rayons } from '@/theme/tokens'

const revenir = () => (router.canGoBack() ? router.back() : router.replace('/'))

/**
 * Supprimer son compte sans l'appli (exigence de Google Play) : e-mail et mot de passe, puis
 * la même suppression que dans l'appli. La connexion se fait à part, sans toucher à la session
 * éventuellement ouverte dans ce navigateur.
 */
export default function SupprimerMonCompte() {
  const { moi, deconnecter } = useSession()
  const confirmer = useConfirmer()
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [visible, setVisible] = useState(false)
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [supprime, setSupprime] = useState(false)

  const supprimer = async () => {
    if (!email.trim() || !motDePasse) {
      setErreur('Indique ton e-mail et ton mot de passe.')
      return
    }
    const ok = await confirmer({
      titre: 'Supprimer ton compte ?',
      message: 'C’est définitif : rien ne pourra être récupéré.',
      action: 'Supprimer',
    })
    if (!ok) return
    setEnCours(true)
    setErreur(null)
    try {
      let jeton: string | null = null
      const client = creerClient({ baseUrl: apiUrl(), jeton: () => jeton })
      jeton = (await client.connexion({ email: email.trim(), motDePasse })).jeton
      await client.supprimerCompte({ motDePasse })
      // Le compte supprimé était peut-être celui ouvert dans ce navigateur.
      if (moi?.utilisateur.email.toLowerCase() === email.trim().toLowerCase()) await deconnecter()
      setSupprime(true)
    } catch (e) {
      setErreur(messageErreur(e))
    } finally {
      setEnCours(false)
    }
  }

  const tete = (
    <Head>
      <title>Supprimer mon compte · Billets doux</title>
      <meta name="description" content="Supprimer son compte Billets doux et toutes ses données." />
    </Head>
  )

  if (supprime) {
    return (
      <Ecran enTete={<EnTete titre="Compte supprimé" retour={revenir} />}>
        {tete}
        <Texte variante="titreM" accessibilityRole="header">
          Ton compte a été supprimé
        </Texte>
        <Texte variante="corpsM">
          Ton compte et tout ce que tu as écrit ont été effacés, photos et vocaux compris. Les
          copies de sauvegarde disparaissent d’elles-mêmes sous 14 jours.
        </Texte>
      </Ecran>
    )
  }

  return (
    <Ecran
      enTete={<EnTete titre="Supprimer mon compte" retour={revenir} />}
      actions={
        <Bouton
          libelle="Supprimer mon compte"
          Icone={Corbeille}
          pleineLargeur
          enCours={enCours}
          onPress={() => void supprimer()}
        />
      }
    >
      {tete}
      <Texte variante="corpsM">
        Ton compte, tes réglages et tout ce que tu as écrit seront effacés, photos et vocaux
        compris. Ton duo sera fermé.
      </Texte>
      <View style={styles.avertissement} accessibilityRole="alert">
        <Texte variante="labelM">
          La personne de ton duo perdra aussi les mots que tu lui as écrits.
        </Texte>
        <Texte variante="corpsS" couleur={couleurs.texte.encreDouce}>
          Exporte-les d’abord si tu veux les garder : dans l’appli, « Nous deux » → « Exporter nos
          souvenirs ».
        </Texte>
      </View>
      <Champ
        libelle="E-mail"
        value={email}
        onChangeText={(texte) => {
          setEmail(texte)
          setErreur(null)
        }}
        autoComplete="email"
        textContentType="emailAddress"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Champ
        libelle="Mot de passe"
        value={motDePasse}
        onChangeText={(texte) => {
          setMotDePasse(texte)
          setErreur(null)
        }}
        secureTextEntry={!visible}
        autoComplete="current-password"
        textContentType="password"
        autoCapitalize="none"
        accessoire={<BoutonVoir visible={visible} basculer={() => setVisible(!visible)} />}
      />
      {erreur ? <Alerte message={erreur} /> : null}
      <LienTexte libelle="Confidentialité" onPress={() => router.push('/confidentialite')} />
    </Ecran>
  )
}

const styles = StyleSheet.create({
  avertissement: {
    gap: 6,
    padding: 16,
    borderRadius: rayons.carte,
    backgroundColor: couleurs.fond.papierOmbre,
  },
})
