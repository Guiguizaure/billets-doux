import { Connexion, ErreurApi } from '@billets-doux/shared'
import { router } from 'expo-router'
import { useState } from 'react'

import { Alerte } from '@/components/Alerte'
import { Bouton } from '@/components/Bouton'
import { BoutonVoir } from '@/components/BoutonVoir'
import { Champ } from '@/components/Champ'
import { Ecran } from '@/components/Ecran'
import { EnTete } from '@/components/EnTete'
import { LienTexte } from '@/components/LienTexte'
import { Texte } from '@/components/Texte'
import { erreursParChamp, messageErreur, sansErreur } from '@/lib/formulaires'
import { useSession } from '@/session/SessionProvider'
import { couleurs } from '@/theme/tokens'

/** Connexion (absente du Figma). */
export default function EcranConnexion() {
  const { connecter } = useSession()
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [visible, setVisible] = useState(false)
  const [erreurs, setErreurs] = useState<Record<string, string>>({})
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)

  const envoyer = async () => {
    const saisie = Connexion.safeParse({ email, motDePasse })
    if (!saisie.success) {
      setErreurs(erreursParChamp(saisie.error))
      return
    }
    setErreurs({})
    setErreur(null)
    setEnCours(true)
    try {
      await connecter(saisie.data)
    } catch (e) {
      const champs = e instanceof ErreurApi ? e.champs : {}
      setErreurs(champs)
      if (Object.keys(champs).length === 0) setErreur(messageErreur(e))
      setEnCours(false)
    }
  }

  return (
    <Ecran
      enTete={
        <EnTete titre="Connexion" retour={router.canGoBack() ? () => router.back() : undefined} />
      }
      actions={
        <>
          <Bouton
            libelle="Se connecter"
            pleineLargeur
            enCours={enCours}
            onPress={() => void envoyer()}
          />
          <LienTexte libelle="Créer un compte" onPress={() => router.replace('/inscription')} />
        </>
      }
    >
      <Texte variante="titreL" accessibilityRole="header">
        Te revoilà
      </Texte>
      <Texte variante="corpsM" couleur={couleurs.texte.encreDouce}>
        Tes mots t’attendent là où tu les as laissés.
      </Texte>
      {erreur ? <Alerte message={erreur} /> : null}
      <Champ
        libelle="E-mail"
        value={email}
        onChangeText={(texte) => {
          setEmail(texte)
          setErreurs((e) => sansErreur(e, 'email'))
        }}
        erreur={erreurs.email}
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
          setErreurs((e) => sansErreur(e, 'motDePasse'))
        }}
        erreur={erreurs.motDePasse}
        secureTextEntry={!visible}
        autoComplete="current-password"
        textContentType="password"
        autoCapitalize="none"
        returnKeyType="done"
        onSubmitEditing={() => void envoyer()}
        accessoire={<BoutonVoir visible={visible} basculer={() => setVisible(!visible)} />}
      />
    </Ecran>
  )
}
