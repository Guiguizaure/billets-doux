import { ErreurApi, formaterCode, normaliserCode, RejoindreDuo } from '@billets-doux/shared'
import { Redirect, router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { StyleSheet } from 'react-native'

import OiseauMessager from '@/assets/illustrations/oiseau-messager.svg'
import { Alerte } from '@/components/Alerte'
import { Bouton } from '@/components/Bouton'
import { Champ } from '@/components/Champ'
import { Ecran } from '@/components/Ecran'
import { EnTete } from '@/components/EnTete'
import { LienTexte } from '@/components/LienTexte'
import { Texte } from '@/components/Texte'
import { messageErreur } from '@/lib/formulaires'
import { useSession } from '@/session/SessionProvider'
import { couleurs } from '@/theme/tokens'

/**
 * Saisie du code d'invitation (absente du Figma). Ouverte depuis « J'ai reçu une invitation »,
 * le lien partagé (billetsdoux://rejoindre?code=… ou /rejoindre?code=… sur le web)
 * ou après l'inscription. Sans compte, le code est gardé le temps de s'inscrire.
 */
export default function Rejoindre() {
  const { phase, api, appliquer, codeEnAttente, retenirCode } = useSession()
  const params = useLocalSearchParams<{ code?: string }>()
  const [saisie, setSaisie] = useState(() => {
    const initial = params.code ?? codeEnAttente
    return initial ? formaterCode(normaliserCode(initial)) : ''
  })
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)
  const codeRecu = Boolean(params.code ?? codeEnAttente)

  if (phase === 'chargement') return null
  if (phase === 'duo') return <Redirect href="/" />
  const visiteur = phase !== 'sansDuo'

  const valider = () => {
    const resultat = RejoindreDuo.safeParse({ code: saisie })
    if (!resultat.success) {
      setErreur(resultat.error.issues[0]?.message ?? 'Code invalide.')
      return null
    }
    setErreur(null)
    return resultat.data.code
  }

  const continuer = (vers: '/inscription' | '/connexion') => {
    const code = valider()
    if (!code) return
    retenirCode(code)
    router.push(vers)
  }

  const rejoindre = async () => {
    const code = valider()
    if (!code) return
    setEnCours(true)
    try {
      const moi = await api.rejoindre(code)
      retenirCode(null)
      // Le duo est formé : la session passe en phase « duo » et l'aiguillage ouvre l'écran 1.3.
      appliquer(moi)
    } catch (e) {
      setErreur(e instanceof ErreurApi ? e.message : messageErreur(e))
      setEnCours(false)
    }
  }

  return (
    <Ecran
      enTete={
        <EnTete
          titre="Rejoindre"
          retour={
            router.canGoBack()
              ? () => router.back()
              : visiteur
                ? () => router.replace('/bienvenue')
                : undefined
          }
        />
      }
      actions={
        visiteur ? (
          <>
            <Bouton
              libelle="Créer mon compte"
              pleineLargeur
              onPress={() => continuer('/inscription')}
            />
            <LienTexte libelle="J’ai déjà un compte" onPress={() => continuer('/connexion')} />
          </>
        ) : (
          <>
            <Bouton
              libelle="Rejoindre"
              pleineLargeur
              enCours={enCours}
              onPress={() => void rejoindre()}
            />
            <LienTexte
              libelle="Je préfère inviter ma personne"
              onPress={() => {
                retenirCode(null)
                router.replace('/inviter')
              }}
            />
          </>
        )
      }
    >
      {/* Illu/oiseau-messager à 75 % (180 × 150). */}
      <OiseauMessager width={180} height={150} style={styles.illustration} />
      <Texte variante="titreL" accessibilityRole="header">
        Entre ton code
      </Texte>
      <Texte variante="corpsM" couleur={couleurs.texte.encreDouce}>
        {codeRecu
          ? 'Le code de ta personne est déjà rempli.'
          : 'Ta personne t’a envoyé un code comme LUNE\u00a0·\u00a04821.'}
        {visiteur ? ' Ensuite, tu crées ton compte et votre duo est formé.' : ''}
      </Texte>
      {erreur ? <Alerte message={erreur} /> : null}
      <Champ
        libelle="Code d’invitation"
        value={saisie}
        onChangeText={(texte) => {
          setSaisie(texte)
          setErreur(null)
        }}
        placeholder="LUNE · 4821"
        autoCapitalize="characters"
        autoCorrect={false}
        autoComplete="off"
        returnKeyType="done"
        onSubmitEditing={() => (visiteur ? continuer('/inscription') : void rejoindre())}
      />
    </Ecran>
  )
}

const styles = StyleSheet.create({
  illustration: {
    alignSelf: 'center',
  },
})
