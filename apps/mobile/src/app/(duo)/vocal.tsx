import { formaterDuree, LIMITES } from '@billets-doux/shared'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { Linking, StyleSheet, View } from 'react-native'

import Boite from '@/assets/icons/Boite.svg'
import Calendrier from '@/assets/icons/Calendrier.svg'
import Envoyer from '@/assets/icons/Envoyer.svg'
import Frequence from '@/assets/icons/Frequence.svg'
import Lecture from '@/assets/icons/Lecture.svg'
import Mot from '@/assets/icons/Mot.svg'
import Pause from '@/assets/icons/Pause.svg'
import FleurQuiChante from '@/assets/illustrations/fleur-qui-chante.svg'
import { Alerte } from '@/components/Alerte'
import { Bouton } from '@/components/Bouton'
import { BoutonRondAction } from '@/components/BoutonRondAction'
import { Ecran } from '@/components/Ecran'
import { EnTete } from '@/components/EnTete'
import { LecteurVocal } from '@/components/LecteurVocal'
import { Onde } from '@/components/Onde'
import { Texte } from '@/components/Texte'
import { boiteAuxLettres } from '@/lib/boiteAuxLettres'
import { api } from '@/lib/client'
import { useEnregistreur } from '@/lib/enregistreur'
import { messageErreur } from '@/lib/formulaires'
import { televerser } from '@/lib/televersement'
import { useSession } from '@/session/SessionProvider'
import { couleurs, rayons } from '@/theme/tokens'

const revenir = () => (router.canGoBack() ? router.back() : router.replace('/reserve'))

/**
 * Écran 3.3 Enregistrer un vocal. `?mode=joindre` : le vocal est joint au mot en cours
 * d'écriture ; `?mode=reponse&mot=` : réponse de 30 s à un mot reçu (2.7) ; sinon il est
 * rangé seul dans la réserve.
 */
export default function EcranVocal() {
  const { mode, mot: motRepondu } = useLocalSearchParams<{ mode?: string; mot?: string }>()
  const joindre = mode === 'joindre'
  const reponse = mode === 'reponse' && Boolean(motRepondu)
  const { moi } = useSession()
  const partenaire = moi?.duo?.partenaire?.prenom ?? 'ta personne'
  const maxSecondes = reponse ? LIMITES.reponseVocalSecondes : LIMITES.vocalSecondes
  const titre = reponse ? 'Répondre en vocal' : 'Nouveau vocal'
  const enregistreur = useEnregistreur(maxSecondes)
  const { etat, duree, niveaux, uri, demarrer } = enregistreur
  const [envoi, setEnvoi] = useState<number | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)

  // L'enregistrement démarre dès l'ouverture de l'écran (après l'accord pour le micro).
  useEffect(() => {
    void demarrer()
  }, [demarrer])

  /** `programmer` : rangé dans la réserve puis ouvert directement dans l'écran 3.5. */
  const valider = async (programmer = false) => {
    if (!uri) return
    if (duree < 1) {
      setErreur('Ce vocal est trop court. Recommence en parlant un peu plus longtemps.')
      return
    }
    setErreur(null)
    setEnvoi(0)
    try {
      const vocal = await televerser({ nature: 'vocal', uri, duree }, setEnvoi)
      if (reponse && motRepondu) {
        await api.repondre(motRepondu, { vocal: vocal.id })
        revenir()
        return
      }
      if (joindre) {
        boiteAuxLettres.deposerVocal(vocal)
        revenir()
        return
      }
      const mot = await api.creerBrouillon({ type: 'vocal', vocal: vocal.id })
      if (programmer) router.replace({ pathname: '/programmer', params: { id: mot.id } })
      else revenir()
    } catch (e) {
      setErreur(messageErreur(e))
      setEnvoi(null)
    }
  }

  if (etat === 'indisponible') {
    return (
      <Ecran enTete={<EnTete titre={titre} retour={revenir} />}>
        <View style={styles.contenu}>
          <FleurQuiChante width={128} height={160} />
          <Texte variante="titreM" style={styles.centre}>
            Les vocaux s’enregistrent sur le téléphone
          </Texte>
          <Texte variante="corpsM" couleur={couleurs.texte.encreDouce} style={styles.centre}>
            Sur la version web, tu peux écouter les vocaux, mais pas en enregistrer.
          </Texte>
        </View>
      </Ecran>
    )
  }

  if (etat === 'refuse') {
    return (
      <Ecran
        enTete={<EnTete titre={titre} retour={revenir} />}
        actions={
          <>
            <Bouton
              libelle="Ouvrir les réglages"
              pleineLargeur
              onPress={() => void Linking.openSettings()}
            />
            <Bouton
              libelle="Réessayer"
              variante="discret"
              pleineLargeur
              onPress={() => void demarrer()}
            />
          </>
        }
      >
        <View style={styles.contenu}>
          <FleurQuiChante width={128} height={160} />
          <Texte variante="titreM" style={styles.centre}>
            Billets doux a besoin du micro
          </Texte>
          <Texte variante="corpsM" couleur={couleurs.texte.encreDouce} style={styles.centre}>
            Autorise l’accès au micro dans les réglages du téléphone pour enregistrer un vocal.
          </Texte>
        </View>
      </Ecran>
    )
  }

  const termine = etat === 'termine'
  const statut =
    etat === 'enregistrement'
      ? 'Enregistrement en cours…'
      : etat === 'pause'
        ? 'En pause'
        : termine
          ? 'Prêt à écouter'
          : 'Préparation du micro…'

  return (
    <Ecran
      enTete={<EnTete titre={titre} retour={revenir} />}
      actions={
        !termine ? null : envoi !== null ? (
          <Bouton libelle={`Envoi… ${Math.round(envoi * 100)} %`} pleineLargeur enCours />
        ) : reponse ? (
          <Bouton
            libelle={`Envoyer à ${partenaire}`}
            Icone={Envoyer}
            pleineLargeur
            onPress={() => void valider()}
          />
        ) : joindre ? (
          <Bouton
            libelle="Joindre au mot"
            Icone={Mot}
            pleineLargeur
            onPress={() => void valider()}
          />
        ) : (
          <View style={styles.actions}>
            <View style={styles.action}>
              <Bouton
                libelle="Dans la réserve"
                Icone={Boite}
                variante="secondaire"
                pleineLargeur
                onPress={() => void valider()}
              />
            </View>
            <View style={styles.action}>
              <Bouton
                libelle="Programmer"
                Icone={Calendrier}
                pleineLargeur
                onPress={() => void valider(true)}
              />
            </View>
          </View>
        )
      }
    >
      <View style={styles.contenu}>
        {/* Illu/fleur-qui-chante (160 × 200) à 80 %, comme dans la maquette. */}
        <FleurQuiChante width={128} height={160} />
        <Texte
          variante="titreXL"
          accessibilityLabel={`Durée : ${formaterDuree(duree).replace(':', ' minute ')} secondes`}
        >
          {formaterDuree(duree)}
        </Texte>
        <View style={styles.statut} accessibilityLiveRegion="polite">
          <View
            style={[
              styles.point,
              { backgroundColor: termine ? couleurs.decor.sauge : couleurs.action.cachet },
            ]}
          />
          <Texte variante="corpsS" couleur={couleurs.texte.encreDouce}>
            {statut}
          </Texte>
        </View>
        <View style={styles.carte}>
          {termine && uri ? (
            <LecteurVocal uriLocale={uri} duree={duree} />
          ) : (
            <Onde niveaux={niveaux} />
          )}
        </View>
        {erreur ? <Alerte message={erreur} /> : null}
        <View style={styles.commandes}>
          <BoutonRondAction
            Icone={Frequence}
            libelle="Recommencer"
            legende="Recommencer"
            variante="carte"
            desactive={etat === 'inactif' || envoi !== null}
            onPress={() => void enregistreur.recommencer()}
          />
          {termine ? null : (
            <>
              <BoutonRondAction
                libelle="Arrêter l’enregistrement"
                legende="Arrêter"
                taille={80}
                variante="cachet"
                desactive={etat === 'inactif'}
                onPress={() => void enregistreur.arreter()}
              >
                <View style={styles.carre} />
              </BoutonRondAction>
              <BoutonRondAction
                Icone={etat === 'pause' ? Lecture : Pause}
                libelle={etat === 'pause' ? 'Reprendre' : 'Mettre en pause'}
                legende={etat === 'pause' ? 'Reprendre' : 'Pause'}
                variante="carte"
                desactive={etat === 'inactif'}
                onPress={etat === 'pause' ? enregistreur.reprendre : enregistreur.pause}
              />
            </>
          )}
        </View>
        <Texte variante="corpsS" couleur={couleurs.texte.encreDouce} style={styles.centre}>
          {reponse ? '30 secondes au plus.' : '3 minutes au plus.'}
        </Texte>
      </View>
    </Ecran>
  )
}

const styles = StyleSheet.create({
  contenu: {
    alignItems: 'center',
    gap: 14,
  },
  centre: {
    textAlign: 'center',
  },
  statut: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  point: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  carte: {
    alignSelf: 'stretch',
    padding: 20,
    borderRadius: rayons.carte,
    borderWidth: 1,
    borderColor: couleurs.trait.ligne,
    backgroundColor: couleurs.fond.carte,
  },
  commandes: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 36,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  action: {
    flex: 1,
  },
  carre: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: couleurs.texte.surCachet,
  },
})
