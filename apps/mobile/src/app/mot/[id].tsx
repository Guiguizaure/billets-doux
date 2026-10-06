import { LIMITES, libellesJour, type MotOuvert, type Reaction } from '@billets-doux/shared'
import { Redirect, router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { useCallback, useState } from 'react'
import { ActivityIndicator, StyleSheet, TextInput, View } from 'react-native'

import Envoyer from '@/assets/icons/Envoyer.svg'
import Plume from '@/assets/icons/Plume.svg'
import Vocal from '@/assets/icons/Vocal.svg'
import FleurQuiChante from '@/assets/illustrations/fleur-qui-chante.svg'
import { Alerte } from '@/components/Alerte'
import { Bouton } from '@/components/Bouton'
import { Ecran } from '@/components/Ecran'
import { EnTete } from '@/components/EnTete'
import { Feuille } from '@/components/Feuille'
import { LecteurGrand } from '@/components/LecteurGrand'
import { LecteurVocal } from '@/components/LecteurVocal'
import { LettreLue } from '@/components/LettreLue'
import { PhotoMedia } from '@/components/PhotoMedia'
import { Polaroid } from '@/components/Polaroid'
import { PastilleReaction, REACTIONS, Reactions } from '@/components/Reactions'
import { Texte } from '@/components/Texte'
import { titresLecture } from '@/lib/calendrierRecu'
import { api } from '@/lib/client'
import { enregistrementPossible } from '@/lib/enregistreur'
import { messageErreur } from '@/lib/formulaires'
import { TYPES_DE_MOT } from '@/lib/typesDeMot'
import { useSession } from '@/session/SessionProvider'
import { familles } from '@/theme/polices'
import { couleurs, rayons } from '@/theme/tokens'

const majuscule = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/**
 * Écrans 2.4 à 2.6 : lire un mot ouvert (lettre, vocal, polaroïd), réagir, répondre (2.7).
 * L'auteur qui relit son mot voit la réaction et la réponse à la place.
 * `?suite=` : d'autres mots attendent leur rituel, ouverts en revenant.
 */
export default function LireMot() {
  const { phase } = useSession()
  // Hors des groupes : se lit avec ou sans duo (souvenirs après une fermeture).
  if (phase === 'chargement') return null
  if (phase !== 'duo' && phase !== 'sansDuo') return <Redirect href="/" />
  return <Lecture />
}

function Lecture() {
  const { id, suite } = useLocalSearchParams<{ id: string; suite?: string }>()
  const [mot, setMot] = useState<MotOuvert | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [feuille, setFeuille] = useState(false)

  // Au retour de l'enregistrement d'une réponse vocale, la réponse est relue.
  useFocusEffect(
    useCallback(() => {
      let annule = false
      api
        .lireMot(id)
        .then((m) => {
          if (!annule) setMot(m)
        })
        .catch((e: unknown) => {
          if (!annule) setErreur(messageErreur(e))
        })
      return () => {
        annule = true
      }
    }, [id]),
  )

  const revenir = () => {
    const [suivant, ...reste] = suite ? suite.split(',').filter(Boolean) : []
    if (suivant) {
      router.replace({
        pathname: '/ouverture/[id]',
        params: { id: suivant, suite: reste.join(',') },
      })
    } else if (router.canGoBack()) router.back()
    else router.replace('/')
  }

  if (!mot) {
    return (
      <Ecran enTete={<EnTete titre="" retour={revenir} />}>
        {erreur ? <Alerte message={erreur} /> : <ActivityIndicator color={couleurs.texte.encre} />}
      </Ecran>
    )
  }

  const { enTete, jourNom } = titresLecture(mot.jour)
  const auteur = mot.auteur.prenom
  const date = mot.jour
    ? majuscule(libellesJour(mot.jour).long)
    : mot.titreOuvreQuand
      ? `Ouvre quand ${mot.titreOuvreQuand}`
      : 'Jamais envoyé'
  const reponse = mot.reponse
  const aRepondu = Boolean(reponse?.texte || reponse?.vocal)

  const reagir = async (reaction: Reaction | null) => {
    const avant = mot
    setMot({ ...mot, reponse: { ...(reponse ?? vide), reaction } })
    try {
      const r = await api.reagir(mot.id, reaction)
      setMot((m) => (m ? { ...m, reponse: r } : m))
    } catch (e) {
      setMot(avant)
      setErreur(messageErreur(e))
    }
  }

  const repondreEnVocal = () => {
    setFeuille(false)
    router.push({ pathname: '/vocal', params: { mode: 'reponse', mot: mot.id } })
  }

  const actionRepondre =
    !mot.peutRepondre || aRepondu ? null : mot.type === 'vocal' && enregistrementPossible ? (
      <Bouton
        libelle="Répondre en vocal"
        Icone={Vocal}
        variante="secondaire"
        pleineLargeur
        onPress={repondreEnVocal}
      />
    ) : (
      <Bouton
        libelle="Répondre par un mot"
        Icone={Plume}
        variante="secondaire"
        pleineLargeur
        onPress={() => setFeuille(true)}
      />
    )

  return (
    <Ecran enTete={<EnTete titre={enTete} retour={revenir} />} actions={actionRepondre}>
      {mot.type === 'vocal' && mot.vocal ? (
        <MotVocal mot={mot} jourNom={jourNom} />
      ) : mot.type === 'photo' && mot.photo ? (
        <Polaroid mot={mot} meta={`${date} · de ${auteur}`.toUpperCase()} />
      ) : (
        <LettreLue
          mot={mot}
          meta={`${TYPES_DE_MOT[mot.type].libelle} · de ${auteur}`.toUpperCase()}
          date={date}
        />
      )}

      {erreur ? <Alerte message={erreur} /> : null}

      {mot.jamaisEnvoye ? (
        <Texte variante="corpsS" couleur={couleurs.texte.encreDouce}>
          Jamais envoyé : ce mot est resté dans ton tiroir quand le duo s’est fermé. Personne
          d’autre ne le voit.
        </Texte>
      ) : mot.vuParAuteur ? (
        <ReponseVue mot={mot} />
      ) : mot.peutRepondre ? (
        <>
          <Reactions valeur={reponse?.reaction ?? null} onChange={(r) => void reagir(r)} />
          {aRepondu && reponse ? (
            <CarteReponse titre="TA RÉPONSE" reponse={{ ...reponse, reaction: null }} />
          ) : null}
        </>
      ) : reponse && (reponse.reaction || reponse.texte || reponse.vocal) ? (
        // Duo fermé : la réponse se relit, on n'y touche plus.
        <CarteReponse titre="TA RÉPONSE" reponse={reponse} />
      ) : null}

      <FeuilleReponse
        visible={feuille}
        mot={mot}
        onFermer={() => setFeuille(false)}
        onReagir={(r) => void reagir(r)}
        onVocal={repondreEnVocal}
        onEnvoye={(r) => {
          setMot({ ...mot, reponse: r })
          setFeuille(false)
        }}
      />
    </Ecran>
  )
}

const vide = { reaction: null, texte: null, vocal: null, envoyeeLe: null }

/** 2.5 : la fleur qui chante, le titre généré, le lecteur et la petite note. */
function MotVocal({ mot, jourNom }: { mot: MotOuvert; jourNom: string | null }) {
  const duree = mot.vocal?.duree ?? 0
  const minutes = Math.floor(duree / 60)
  const secondes = String(Math.round(duree % 60)).padStart(2, '0')
  const longueur = minutes > 0 ? `${minutes} min ${secondes}` : `${Math.round(duree)} s`
  return (
    <View style={styles.vocal}>
      <FleurQuiChante width={136} height={170} />
      <Texte variante="labelS" couleur={couleurs.texte.encreDouce}>
        {`Vocal · de ${mot.auteur.prenom} · ${longueur}`.toUpperCase()}
      </Texte>
      <Texte variante="titreL" style={styles.centre} accessibilityRole="header">
        {jourNom ? (
          <>
            Un vocal pour ton <Texte variante="titreItaliqueL">{jourNom}</Texte>
          </>
        ) : (
          <>
            Ouvre quand <Texte variante="titreItaliqueL">{mot.titreOuvreQuand}</Texte>
          </>
        )}
      </Texte>
      <View style={styles.pleineLargeur}>
        <LecteurGrand mediaId={mot.vocal?.id ?? ''} duree={duree} />
      </View>
      {mot.photo ? (
        <View style={styles.pleineLargeur}>
          <PhotoMedia mediaId={mot.photo.id} description="Photo du mot" />
        </View>
      ) : null}
      {mot.texte?.trim() ? (
        <View style={styles.note}>
          <Texte variante="manuscritM">« {mot.texte} »</Texte>
        </View>
      ) : null}
    </View>
  )
}

/** Vue de l'auteur : ce que la personne a répondu, ou l'attente. */
function ReponseVue({ mot }: { mot: MotOuvert }) {
  const prenom = mot.destinataire.prenom
  const r = mot.reponse
  return (
    <View style={styles.reponseAuteur}>
      {mot.ouvertAvecJoker ? (
        <Texte variante="corpsS" couleur={couleurs.texte.encreDouce}>
          {prenom} l’a ouvert en avance, avec le joker du mois.
        </Texte>
      ) : null}
      {r && (r.reaction || r.texte || r.vocal) ? (
        <CarteReponse titre={`LA RÉPONSE DE ${prenom.toUpperCase()}`} reponse={r} />
      ) : (
        <Texte variante="corpsS" couleur={couleurs.texte.encreDouce}>
          Pas encore de réponse de {prenom}.
        </Texte>
      )}
    </View>
  )
}

function CarteReponse({
  titre,
  reponse,
}: {
  titre: string
  reponse: NonNullable<MotOuvert['reponse']>
}) {
  return (
    <View style={styles.carteReponse}>
      <Texte variante="labelS" couleur={couleurs.texte.encreDouce}>
        {titre}
      </Texte>
      {reponse.reaction ? (
        <View style={styles.ligne}>
          <PastilleReaction reaction={reponse.reaction} taille={36} />
          <Texte variante="corpsS" couleur={couleurs.texte.encreDouce}>
            {REACTIONS[reponse.reaction].libelle}
          </Texte>
        </View>
      ) : null}
      {reponse.texte ? <Texte variante="manuscritM">{reponse.texte}</Texte> : null}
      {reponse.vocal ? (
        <LecteurVocal mediaId={reponse.vocal.id} duree={reponse.vocal.duree ?? 0} />
      ) : null}
    </View>
  )
}

/** 2.7 Répondre : une réaction, et un mot court (140 signes) ou un vocal de 30 s. */
function FeuilleReponse({
  visible,
  mot,
  onFermer,
  onReagir,
  onVocal,
  onEnvoye,
}: {
  visible: boolean
  mot: MotOuvert
  onFermer: () => void
  onReagir: (r: Reaction | null) => void
  onVocal: () => void
  onEnvoye: (r: NonNullable<MotOuvert['reponse']>) => void
}) {
  const [texte, setTexte] = useState('')
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const envoyer = async () => {
    if (!texte.trim()) {
      setErreur('Écris quelques mots.')
      return
    }
    setEnCours(true)
    setErreur(null)
    try {
      onEnvoye(await api.repondre(mot.id, { texte: texte.trim() }))
      setTexte('')
    } catch (e) {
      setErreur(messageErreur(e))
    } finally {
      setEnCours(false)
    }
  }

  return (
    <Feuille visible={visible} onFermer={onFermer}>
      <View style={styles.titreFeuille}>
        <Texte variante="titreM" accessibilityRole="header">
          Répondre à {mot.auteur.prenom}
        </Texte>
        <Texte variante="corpsS" couleur={couleurs.texte.encreDouce}>
          Un mot court, à découvrir en ouvrant l’appli.
        </Texte>
      </View>
      <Reactions valeur={mot.reponse?.reaction ?? null} onChange={onReagir} />
      <View style={styles.champ}>
        <TextInput
          value={texte}
          onChangeText={(t) => {
            setTexte(t)
            setErreur(null)
          }}
          maxLength={LIMITES.reponseTexte}
          multiline
          placeholder="Tu sens la mer toi aussi ce matin ?"
          placeholderTextColor={couleurs.texte.encreDouce}
          selectionColor={couleurs.texte.encre}
          accessibilityLabel={`Ta réponse à ${mot.auteur.prenom}`}
          accessibilityHint={erreur ?? `${LIMITES.reponseTexte} signes au plus`}
          style={styles.saisie}
        />
        <Texte variante="labelS" couleur={couleurs.texte.encreDouce} style={styles.compteur}>
          {texte.length} / {LIMITES.reponseTexte}
        </Texte>
      </View>
      {erreur ? <Alerte message={erreur} /> : null}
      <View style={styles.boutons}>
        {enregistrementPossible ? (
          <View style={styles.bouton}>
            <Bouton
              libelle={`Vocal ${LIMITES.reponseVocalSecondes} s`}
              Icone={Vocal}
              variante="secondaire"
              pleineLargeur
              onPress={onVocal}
            />
          </View>
        ) : null}
        <View style={styles.bouton}>
          <Bouton
            libelle="Envoyer"
            Icone={Envoyer}
            pleineLargeur
            enCours={enCours}
            onPress={() => void envoyer()}
          />
        </View>
      </View>
    </Feuille>
  )
}

const styles = StyleSheet.create({
  centre: {
    textAlign: 'center',
  },
  vocal: {
    alignItems: 'center',
    gap: 14,
  },
  pleineLargeur: {
    alignSelf: 'stretch',
  },
  note: {
    alignSelf: 'stretch',
    padding: 16,
    borderRadius: rayons.carte,
    backgroundColor: couleurs.fond.papierOmbre,
  },
  reponseAuteur: {
    gap: 12,
  },
  carteReponse: {
    gap: 10,
    padding: 16,
    borderRadius: rayons.carte,
    borderWidth: 1,
    borderColor: couleurs.trait.ligne,
    backgroundColor: couleurs.fond.carte,
  },
  ligne: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  titreFeuille: {
    gap: 8,
  },
  champ: {
    gap: 4,
    paddingHorizontal: 17,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: couleurs.trait.ligne,
    backgroundColor: couleurs.fond.papier,
  },
  saisie: {
    minHeight: 56,
    fontFamily: familles.manuscrit,
    fontSize: 23,
    lineHeight: 28,
    color: couleurs.texte.encre,
    textAlignVertical: 'top',
    padding: 0,
  },
  compteur: {
    textAlign: 'right',
  },
  boutons: {
    flexDirection: 'row',
    gap: 10,
  },
  bouton: {
    flex: 1,
  },
})
