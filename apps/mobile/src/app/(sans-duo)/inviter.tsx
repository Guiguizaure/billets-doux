import { formaterCode } from '@billets-doux/shared'
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { AccessibilityInfo, ActivityIndicator, AppState, StyleSheet, View } from 'react-native'

import Horloge from '@/assets/icons/Horloge.svg'
import Lien from '@/assets/icons/Lien.svg'
import BordureParAvion from '@/assets/illustrations/bordure-par-avion.svg'
import FilEntreNous from '@/assets/illustrations/fil-entre-nous.svg'
import { Alerte } from '@/components/Alerte'
import { Bouton } from '@/components/Bouton'
import { Ecran } from '@/components/Ecran'
import { EnTete } from '@/components/EnTete'
import { LienTexte } from '@/components/LienTexte'
import { Texte } from '@/components/Texte'
import { messageErreur } from '@/lib/formulaires'
import { copier, partager } from '@/lib/partage'
import { useSession } from '@/session/SessionProvider'
import { couleurs, rayons, typo } from '@/theme/tokens'

/** On vérifie toutes les 10 s si la personne a rejoint (les notifications viendront à l'étape 6). */
const ATTENTE_MS = 10_000

/** Écran 1.2 Inviter sa personne. */
export default function Inviter() {
  const { api, moi, appliquer, actualiser, deconnecter } = useSession()
  const invitation = moi?.duo?.invitation ?? null
  const [erreur, setErreur] = useState<string | null>(null)
  const [retour, setRetour] = useState<string | null>(null)

  // Crée l'invitation, ou la renouvelle si elle a expiré.
  useEffect(() => {
    let annule = false
    api
      .inviter()
      .then((suivant) => {
        if (!annule) appliquer(suivant)
      })
      .catch((e: unknown) => {
        if (!annule) setErreur(messageErreur(e))
      })
    return () => {
      annule = true
    }
  }, [api, appliquer])

  // Attend la personne : dès qu'elle rejoint, la session passe en « duo » et l'écran 1.3 s'ouvre.
  useEffect(() => {
    const minuteur = setInterval(() => {
      if (AppState.currentState === 'active') void actualiser()
    }, ATTENTE_MS)
    const abonnement = AppState.addEventListener('change', (etat) => {
      if (etat === 'active') void actualiser()
    })
    return () => {
      clearInterval(minuteur)
      abonnement.remove()
    }
  }, [actualiser])

  const annoncer = (message: string) => {
    setRetour(message)
    AccessibilityInfo.announceForAccessibility(message)
  }

  const surPartage = async () => {
    if (!invitation || !moi) return
    const code = formaterCode(invitation.code)
    const resultat = await partager({
      lien: invitation.lien,
      message:
        `${moi.utilisateur.prenom} t’invite sur Billets doux, un calendrier de petits mots ` +
        `rien que pour vous deux.\n\nOuvre ce lien : ${invitation.lien}\n` +
        `Ou entre le code ${code} dans l’appli.`,
    })
    if (resultat === 'copie') annoncer('Lien copié. Colle-le dans un message à ta personne.')
    if (resultat === 'impossible') annoncer(`Partage indisponible ici : envoie le code ${code}.`)
  }

  const surCopie = async () => {
    if (!invitation) return
    const code = formaterCode(invitation.code)
    annoncer(
      (await copier(code)) ? 'Code copié.' : `Copie indisponible ici : note le code ${code}.`,
    )
  }

  return (
    <Ecran
      enTete={<EnTete titre="Ta personne" />}
      actions={
        <>
          <Bouton
            libelle="Partager le lien"
            Icone={Lien}
            pleineLargeur
            desactive={!invitation}
            onPress={() => void surPartage()}
          />
          <Bouton
            libelle="Copier le code"
            variante="discret"
            pleineLargeur
            desactive={!invitation}
            onPress={() => void surCopie()}
          />
        </>
      }
    >
      <View style={styles.contenu}>
        {/* Illu/fil-entre-nous à sa taille d'origine. */}
        <FilEntreNous width={306} height={144} />
        <View style={styles.texte}>
          <Texte variante="titreL" accessibilityRole="header">
            Invite ta personne
          </Texte>
          <Texte variante="corpsM" couleur={couleurs.texte.encreDouce}>
            Billets doux se partage avec une seule personne à la fois. Dès qu’elle accepte, votre
            duo est créé.
          </Texte>
        </View>
        {erreur ? <Alerte message={erreur} /> : null}
        <View style={styles.carte}>
          <BordureParAvion width="100%" height={8.5} preserveAspectRatio="none" />
          <View
            style={styles.code}
            accessible
            accessibilityLabel={
              invitation
                ? `Ton code d’invitation : ${formaterCode(invitation.code)}. ${validite(invitation.expireLe)}.`
                : 'Création de ton code d’invitation'
            }
          >
            <Texte variante="labelS" couleur={couleurs.texte.encreDouce}>
              TON CODE D’INVITATION
            </Texte>
            {invitation ? (
              <Texte variante="titreL" style={styles.valeurCode}>
                {formaterCode(invitation.code)}
              </Texte>
            ) : (
              <ActivityIndicator style={styles.chargement} color={couleurs.texte.encre} />
            )}
            <View style={styles.rangee}>
              <Horloge width={16} height={16} color={couleurs.texte.encreDouce} />
              <Texte variante="corpsS" couleur={couleurs.texte.encreDouce}>
                {invitation ? validite(invitation.expireLe) : 'Valable 7 jours'}
              </Texte>
            </View>
          </View>
        </View>
        {retour ? (
          <Texte variante="corpsS" style={styles.centre}>
            {retour}
          </Texte>
        ) : null}
        <Texte variante="corpsS" couleur={couleurs.texte.encreDouce} style={styles.centre}>
          On t’attend ici : dès que ta personne a rejoint, votre duo s’ouvre.
        </Texte>
        <View style={styles.liens}>
          <LienTexte libelle="J’ai reçu un code" onPress={() => router.push('/rejoindre')} />
          <LienTexte libelle="Mes souvenirs" onPress={() => router.push('/mes-souvenirs')} />
          <LienTexte libelle="Se déconnecter" onPress={() => void deconnecter()} />
        </View>
      </View>
    </Ecran>
  )
}

/** « Valable 7 jours », « Valable encore 3 jours », « Valable jusqu'à demain ». */
function validite(expireLe: string) {
  const jours = Math.ceil((Date.parse(expireLe) - Date.now()) / 86_400_000)
  if (jours >= 7) return 'Valable 7 jours'
  if (jours > 1) return `Valable encore ${jours} jours`
  return 'Valable jusqu’à demain'
}

const styles = StyleSheet.create({
  contenu: {
    alignItems: 'center',
    gap: 18,
  },
  texte: {
    alignSelf: 'stretch',
    gap: 8,
  },
  carte: {
    alignSelf: 'stretch',
    overflow: 'hidden',
    borderRadius: rayons.carte,
    borderWidth: 1,
    borderColor: couleurs.trait.ligne,
    backgroundColor: couleurs.fond.carte,
  },
  code: {
    gap: 6,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 22,
  },
  valeurCode: {
    // Figma : interlettrage de 6 % sur le code.
    letterSpacing: typo.titreL.fontSize * 0.06,
  },
  chargement: {
    alignSelf: 'flex-start',
    height: typo.titreL.lineHeight,
  },
  rangee: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  centre: {
    textAlign: 'center',
  },
  liens: {
    flexDirection: 'row',
    gap: 24,
  },
})
