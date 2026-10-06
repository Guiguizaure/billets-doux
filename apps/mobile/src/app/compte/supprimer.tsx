import { Redirect, router } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'

import Corbeille from '@/assets/icons/Corbeille.svg'
import { Alerte } from '@/components/Alerte'
import { Bouton } from '@/components/Bouton'
import { Champ } from '@/components/Champ'
import { useConfirmer } from '@/components/Dialogue'
import { Ecran } from '@/components/Ecran'
import { EnTete } from '@/components/EnTete'
import { LienTexte } from '@/components/LienTexte'
import { Texte } from '@/components/Texte'
import { exporterSouvenirs } from '@/lib/export'
import { messageErreur } from '@/lib/formulaires'
import { useSession } from '@/session/SessionProvider'
import { couleurs, rayons } from '@/theme/tokens'

const revenir = () => (router.canGoBack() ? router.back() : router.replace('/'))

/**
 * Supprimer son compte (exigence des stores) : tout ce qu'on a écrit disparaît, y compris
 * les mots déjà ouverts par l'autre. Le mot de passe est redemandé.
 */
export default function SupprimerCompte() {
  const { phase } = useSession()
  if (phase === 'chargement') return null
  if (phase !== 'duo' && phase !== 'sansDuo') return <Redirect href="/" />
  return <Formulaire />
}

function Formulaire() {
  const { api, moi, deconnecter } = useSession()
  const confirmer = useConfirmer()
  const partenaire = moi?.duo?.partenaire?.prenom ?? null
  const duoEnCours = moi?.duo?.statut === 'actif' || moi?.duo?.statut === 'pause'
  const [motDePasse, setMotDePasse] = useState('')
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const supprimer = async () => {
    if (!motDePasse) {
      setErreur('Indique ton mot de passe.')
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
      await api.supprimerCompte({ motDePasse })
      // Le compte n'existe plus : la session s'efface et l'appli revient à l'accueil.
      await deconnecter()
    } catch (e) {
      setErreur(messageErreur(e))
      setEnCours(false)
    }
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
      <Texte variante="corpsM">
        Ton compte, tes réglages et tout ce que tu as écrit seront effacés, photos et vocaux
        compris.{duoEnCours ? ' Ton duo sera fermé.' : ''}
      </Texte>
      <View style={styles.avertissement} accessibilityRole="alert">
        <Texte variante="labelM">
          {partenaire
            ? `${partenaire} perdra aussi les mots que tu lui as écrits.`
            : 'Les mots que tu as écrits disparaîtront aussi pour l’autre.'}
        </Texte>
        <Texte variante="corpsS" couleur={couleurs.texte.encreDouce}>
          Exporte-les d’abord si tu veux les garder.
        </Texte>
        <LienTexte
          libelle="Exporter mes souvenirs"
          onPress={() =>
            void exporterSouvenirs().catch((e: unknown) => setErreur(messageErreur(e)))
          }
        />
      </View>
      <Champ
        libelle="Mot de passe"
        value={motDePasse}
        onChangeText={(t) => {
          setMotDePasse(t)
          setErreur(null)
        }}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
      />
      {erreur ? <Alerte message={erreur} /> : null}
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
