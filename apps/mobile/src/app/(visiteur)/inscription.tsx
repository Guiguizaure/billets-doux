import { ErreurApi, formaterCode, Inscription } from '@billets-doux/shared'
import { router } from 'expo-router'
import { useState } from 'react'

import { Alerte } from '@/components/Alerte'
import { Bouton } from '@/components/Bouton'
import { CaseACocher } from '@/components/CaseACocher'
import { BoutonVoir } from '@/components/BoutonVoir'
import { Champ } from '@/components/Champ'
import { Ecran } from '@/components/Ecran'
import { EnTete } from '@/components/EnTete'
import { LienTexte } from '@/components/LienTexte'
import { Texte } from '@/components/Texte'
import { erreursParChamp, messageErreur, sansErreur } from '@/lib/formulaires'
import { fuseauDuTelephone } from '@/lib/fuseau'
import { useSession } from '@/session/SessionProvider'
import { couleurs } from '@/theme/tokens'

/** Inscription (absente du Figma) : prénom, e-mail, mot de passe, « J'ai 18 ans ou plus ». */
export default function EcranInscription() {
  const { inscrire, codeEnAttente } = useSession()
  const [prenom, setPrenom] = useState('')
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [visible, setVisible] = useState(false)
  const [majeur, setMajeur] = useState(false)
  const [erreurs, setErreurs] = useState<Record<string, string>>({})
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)

  const envoyer = async () => {
    const saisie = Inscription.safeParse({
      prenom,
      email,
      motDePasse,
      fuseauHoraire: fuseauDuTelephone(),
      majeur,
    })
    if (!saisie.success) {
      setErreurs(erreursParChamp(saisie.error))
      return
    }
    setErreurs({})
    setErreur(null)
    setEnCours(true)
    try {
      // En cas de succès, la session change de phase et l'aiguillage prend le relais.
      await inscrire(saisie.data)
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
        <EnTete titre="Ton compte" retour={router.canGoBack() ? () => router.back() : undefined} />
      }
      actions={
        <>
          <Bouton
            libelle="Créer mon compte"
            pleineLargeur
            enCours={enCours}
            onPress={() => void envoyer()}
          />
          <LienTexte libelle="J’ai déjà un compte" onPress={() => router.replace('/connexion')} />
        </>
      }
    >
      <Texte variante="titreL" accessibilityRole="header">
        Faisons connaissance
      </Texte>
      <Texte variante="corpsM" couleur={couleurs.texte.encreDouce}>
        {codeEnAttente
          ? `Crée ton compte, puis tu rejoindras l’invitation ${formaterCode(codeEnAttente)}.`
          : 'Ta personne ne verra que ton prénom.'}
      </Texte>
      {erreur ? <Alerte message={erreur} /> : null}
      <Champ
        libelle="Prénom"
        value={prenom}
        onChangeText={(texte) => {
          setPrenom(texte)
          setErreurs((e) => sansErreur(e, 'prenom'))
        }}
        erreur={erreurs.prenom}
        autoComplete="given-name"
        textContentType="givenName"
        autoCapitalize="words"
        returnKeyType="next"
      />
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
        returnKeyType="next"
      />
      <Champ
        libelle="Mot de passe"
        value={motDePasse}
        onChangeText={(texte) => {
          setMotDePasse(texte)
          setErreurs((e) => sansErreur(e, 'motDePasse'))
        }}
        erreur={erreurs.motDePasse}
        aide="8 caractères au moins."
        secureTextEntry={!visible}
        autoComplete="new-password"
        textContentType="newPassword"
        autoCapitalize="none"
        returnKeyType="done"
        onSubmitEditing={() => void envoyer()}
        accessoire={<BoutonVoir visible={visible} basculer={() => setVisible(!visible)} />}
      />
      <CaseACocher
        libelle="J’ai 18 ans ou plus"
        coche={majeur}
        onChange={(coche) => {
          setMajeur(coche)
          setErreurs((e) => sansErreur(e, 'majeur'))
        }}
        erreur={erreurs.majeur}
      />
    </Ecran>
  )
}
