import {
  formaterHeure,
  libellesJour,
  LIMITES,
  type MotProgramme,
  TypeMot,
} from '@billets-doux/shared'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, TextInput, View } from 'react-native'

import Apercu from '@/assets/icons/Apercu.svg'
import Boite from '@/assets/icons/Boite.svg'
import Calendrier from '@/assets/icons/Calendrier.svg'
import Corbeille from '@/assets/icons/Corbeille.svg'
import Photo from '@/assets/icons/Photo.svg'
import Valider from '@/assets/icons/Valider.svg'
import Vocal from '@/assets/icons/Vocal.svg'
import BordureParAvion from '@/assets/illustrations/bordure-par-avion.svg'
import { Alerte } from '@/components/Alerte'
import { BandeauInfo } from '@/components/BandeauInfo'
import { Bouton } from '@/components/Bouton'
import { BoutonRondAction } from '@/components/BoutonRondAction'
import { useConfirmer } from '@/components/Dialogue'
import { Champ } from '@/components/Champ'
import { Ecran } from '@/components/Ecran'
import { EnTete } from '@/components/EnTete'
import { Interrupteur } from '@/components/Interrupteur'
import { LecteurVocal } from '@/components/LecteurVocal'
import { LettreApercu } from '@/components/LettreApercu'
import { LienTexte } from '@/components/LienTexte'
import { PhotoMedia } from '@/components/PhotoMedia'
import { Puce } from '@/components/Puce'
import { Texte } from '@/components/Texte'
import { boiteAuxLettres } from '@/lib/boiteAuxLettres'
import { api } from '@/lib/client'
import { messageErreur } from '@/lib/formulaires'
import { messageFlash } from '@/lib/messageFlash'
import { vibrer } from '@/lib/vibrer'
import { useSourcePhoto } from '@/lib/sourcePhoto'
import { choisirPhoto, PermissionRefusee } from '@/lib/photo'
import { televerser } from '@/lib/televersement'
import { TYPES_DE_MOT } from '@/lib/typesDeMot'
import {
  type ChampsBrouillon,
  champsDepuis,
  champsVides,
  type EtatSauvegarde,
  useBrouillon,
} from '@/lib/useBrouillon'
import { useSession } from '@/session/SessionProvider'
import { familles } from '@/theme/polices'
import { couleurs, rayons, typo } from '@/theme/tokens'

type Initial = {
  id: string | null
  champs: ChampsBrouillon
  /** Déjà programmé (modifiable jusqu'à son ouverture). */
  programmation: MotProgramme['programmation'] | null
}

/**
 * Écran 3.4 Écrire un mot : nouveau, ou existant avec `?id=` (brouillon ou mot programmé).
 * `?jour=` (case libre du calendrier) et `?mode=ouvre_quand` sont transmis à l'écran 3.5.
 */
export default function Ecrire() {
  const params = useLocalSearchParams<{
    id?: string
    type?: string
    jour?: string
    mode?: string
  }>()
  const typeDemande = TypeMot.safeParse(params.type).data
  const [initial, setInitial] = useState<Initial | null>(
    params.id ? null : { id: null, champs: champsVides(typeDemande), programmation: null },
  )

  useEffect(() => {
    if (!params.id) return
    let annule = false
    Promise.all([api.reserve(), api.calendrier()])
      .then(([reserve, calendrier]) => {
        const brouillon = reserve.mots.find((m) => m.id === params.id)
        const programme = calendrier.mots.find((m) => m.id === params.id && !m.ouvertLe)
        const mot = brouillon ?? programme
        if (!annule) {
          setInitial(
            mot
              ? {
                  id: mot.id,
                  champs: champsDepuis(mot),
                  programmation: programme?.programmation ?? null,
                }
              : { id: null, champs: champsVides(), programmation: null },
          )
        }
      })
      .catch(() => {
        if (!annule) setInitial({ id: null, champs: champsVides(), programmation: null })
      })
    return () => {
      annule = true
    }
  }, [params.id])

  if (!initial) {
    return (
      <Ecran enTete={<EnTete titre="Mot" retour={revenir} />}>
        <ActivityIndicator color={couleurs.texte.encre} />
      </Ecran>
    )
  }
  return (
    <Editeur
      initial={initial}
      jourDemande={params.jour ?? null}
      modeDemande={params.mode ?? null}
    />
  )
}

function revenir() {
  if (router.canGoBack()) router.back()
  else router.replace('/reserve')
}

function Editeur({
  initial,
  jourDemande,
  modeDemande,
}: {
  initial: Initial
  jourDemande: string | null
  modeDemande: string | null
}) {
  const { moi } = useSession()
  const destinataire = moi?.duo?.partenaire?.prenom ?? 'ta personne'
  const brouillon = useBrouillon(initial)
  const { champs, modifier } = brouillon
  const [apercu, setApercu] = useState(false)
  const confirmer = useConfirmer()
  const choisirSourcePhoto = useSourcePhoto()
  const [envoiPhoto, setEnvoiPhoto] = useState<{ uri: string; progression: number } | null>(null)
  const [erreurMedia, setErreurMedia] = useState<string | null>(null)
  // Photo choisie mais pas partie (réseau) : on la renvoie d'un toucher, sans la rechoisir.
  const [photoEnEchec, setPhotoEnEchec] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  // Retour de l'enregistreur (3.3) : le vocal enregistré est joint au mot.
  useFocusEffect(
    useCallback(() => {
      const vocal = boiteAuxLettres.prendreVocal()
      if (vocal) modifier({ vocal })
    }, [modifier]),
  )

  const quitter = async () => {
    await brouillon.forcer()
    revenir()
  }

  const envoyerPhoto = async (uri: string) => {
    setErreurMedia(null)
    setPhotoEnEchec(null)
    setEnvoiPhoto({ uri, progression: 0 })
    try {
      const media = await televerser({ nature: 'photo', uri }, (progression) =>
        setEnvoiPhoto((e) => (e ? { ...e, progression } : e)),
      )
      modifier({ photo: media })
    } catch {
      setPhotoEnEchec(uri)
    } finally {
      setEnvoiPhoto(null)
    }
  }

  const ajouterPhoto = async () => {
    setErreurMedia(null)
    const source = await choisirSourcePhoto()
    if (!source) return
    try {
      const photo = await choisirPhoto(source)
      if (photo) await envoyerPhoto(photo.uri)
    } catch (e) {
      setErreurMedia(
        e instanceof PermissionRefusee
          ? 'Autorise l’appareil photo dans les réglages du téléphone.'
          : messageErreur(e),
      )
    }
  }

  const ouvrirEnregistreur = async () => {
    await brouillon.forcer()
    router.push({ pathname: '/vocal', params: { mode: 'joindre' } })
  }

  const ranger = async () => {
    if (brouillon.estVide) {
      setMessage('Écris quelques mots, ou joins une photo ou un vocal, avant de ranger.')
      return
    }
    await brouillon.forcer()
    revenir()
  }

  // Ouvert depuis une case du calendrier : le jour est déjà choisi, on programme directement.
  const jourDirect =
    !initial.programmation && jourDemande && modeDemande !== 'ouvre_quand' ? jourDemande : null
  const [programmation, setProgrammation] = useState(false)

  const programmerDirectement = async () => {
    if (!jourDirect) return
    if (brouillon.estVide) {
      setMessage('Écris quelques mots, ou joins une photo ou un vocal, avant de programmer.')
      return
    }
    setProgrammation(true)
    setMessage(null)
    try {
      const id = await brouillon.forcer()
      if (!id) return
      const [, cal] = await Promise.all([
        api.programmer(id, { mode: 'date', jour: jourDirect }),
        api.calendrier(),
      ])
      messageFlash.deposer(
        `Programmé pour ${libellesJour(jourDirect).court} à ${formaterHeure(cal.destinataire.heureDecouverte)}`,
      )
      vibrer.programme()
      router.dismissTo('/pour-toi')
    } catch (e) {
      setMessage(messageErreur(e))
    } finally {
      setProgrammation(false)
    }
  }

  /** Enregistre, puis passe à l'écran 3.5 « Quand l'ouvrir ? ». */
  const choisirQuand = async () => {
    if (brouillon.estVide) {
      setMessage('Écris quelques mots, ou joins une photo ou un vocal, avant de choisir le jour.')
      return
    }
    const id = await brouillon.forcer()
    if (!id) return
    router.push({
      pathname: '/programmer',
      params: {
        id,
        ...(jourDemande ? { jour: jourDemande } : {}),
        ...(modeDemande ? { mode: modeDemande } : {}),
      },
    })
  }

  const supprimer = async () => {
    const ok = await confirmer({
      titre: initial.programmation ? 'Supprimer ce mot ?' : 'Supprimer ce brouillon ?',
      message: 'Le texte, la photo et le vocal seront effacés. Impossible de revenir en arrière.',
      action: 'Supprimer',
    })
    if (!ok) return
    try {
      await brouillon.supprimer()
      revenir()
    } catch (e) {
      setErreurMedia(messageErreur(e))
    }
  }

  return (
    <Ecran
      enTete={
        <EnTete
          titre={initial.id ? 'Modifier le mot' : 'Nouveau mot'}
          retour={() => void quitter()}
          action={{
            Icone: Apercu,
            libelle: apercu ? 'Revenir à l’écriture' : 'Aperçu',
            onPress: () => setApercu(!apercu),
            active: apercu,
          }}
        />
      }
      actions={
        <>
          {/* Même poids pour les deux choix. Côte à côte, chaque bouton n'aurait que ~79 dp
              pour son libellé à 360 dp (~160 dp nécessaires) : empilés, Principal au-dessus. */}
          {jourDirect ? (
            <>
              {/* « Programmer pour dimanche 30 » : 226 px pour 244 disponibles à 360 dp ;
                  avec un texte agrandi, le libellé passe sur deux lignes. */}
              <Bouton
                libelle={`Programmer pour ${libellesJour(jourDirect).court}`}
                Icone={Calendrier}
                pleineLargeur
                enCours={programmation}
                onPress={() => void programmerDirectement()}
              />
              <Bouton
                libelle="Changer la date"
                variante="discret"
                pleineLargeur
                onPress={() => void choisirQuand()}
              />
            </>
          ) : (
            <Bouton
              libelle={initial.programmation ? 'Changer quand l’ouvrir' : 'Choisir quand l’ouvrir'}
              Icone={Calendrier}
              pleineLargeur
              onPress={() => void choisirQuand()}
            />
          )}
          <Bouton
            libelle={initial.programmation ? 'Terminé' : 'Garder dans la réserve'}
            Icone={initial.programmation ? Valider : Boite}
            variante="secondaire"
            pleineLargeur
            onPress={() => void ranger()}
          />
        </>
      }
    >
      {initial.programmation ? (
        <Texte variante="corpsS" couleur={couleurs.texte.encreDouce}>
          {descriptionProgrammation(initial.programmation)}
        </Texte>
      ) : null}
      {apercu ? (
        <LettreApercu
          destinataire={destinataire}
          type={champs.type}
          texte={champs.texte}
          manuscrit={champs.manuscrit}
          photo={champs.photo}
          vocal={champs.vocal}
          indice={champs.indice.trim() || null}
        />
      ) : (
        <>
          <View style={styles.types} accessibilityRole="radiogroup">
            {TypeMot.options.map((type) => (
              <Puce
                key={type}
                libelle={TYPES_DE_MOT[type].libelle}
                active={champs.type === type}
                onPress={() => modifier({ type })}
              />
            ))}
          </View>

          <View style={styles.carte}>
            <BordureParAvion width="100%" height={8.5} preserveAspectRatio="none" />
            <View style={styles.feuille}>
              <Texte variante="labelS" couleur={couleurs.texte.encreDouce}>
                POUR {destinataire.toUpperCase()}
              </Texte>
              {envoiPhoto ? (
                <View>
                  <PhotoMedia uriLocale={envoiPhoto.uri} description="Photo en cours d’envoi" />
                  <Texte variante="labelS" couleur={couleurs.texte.encreDouce}>
                    Envoi de la photo… {Math.round(envoiPhoto.progression * 100)} %
                  </Texte>
                </View>
              ) : champs.photo ? (
                <View style={styles.media}>
                  <PhotoMedia mediaId={champs.photo.id} description="Photo jointe au mot" />
                  <LienTexte libelle="Retirer la photo" onPress={() => modifier({ photo: null })} />
                </View>
              ) : null}
              <TextInput
                value={champs.texte}
                onChangeText={(texte) => modifier({ texte })}
                multiline
                maxLength={LIMITES.texte}
                placeholder={
                  champs.type === 'poeme' ? 'Un vers, puis un autre…' : 'Écris ce qui te vient…'
                }
                placeholderTextColor={couleurs.texte.encreDouce}
                selectionColor={couleurs.action.cachet}
                accessibilityLabel={`Ton ${TYPES_DE_MOT[champs.type].libelle.toLowerCase()} pour ${destinataire}`}
                style={[styles.saisie, champs.manuscrit ? styles.manuscrit : styles.clavier]}
              />
              {champs.vocal ? (
                <View style={styles.media}>
                  <LecteurVocal mediaId={champs.vocal.id} duree={champs.vocal.duree ?? 0} />
                  <LienTexte libelle="Retirer le vocal" onPress={() => modifier({ vocal: null })} />
                </View>
              ) : null}
              <View style={styles.outils}>
                <BoutonRondAction
                  Icone={Photo}
                  libelle={champs.photo ? 'Changer la photo' : 'Joindre une photo'}
                  taille={40}
                  tailleIcone={18}
                  desactive={Boolean(envoiPhoto)}
                  onPress={() => void ajouterPhoto()}
                />
                <BoutonRondAction
                  Icone={Vocal}
                  libelle={champs.vocal ? 'Réenregistrer le vocal' : 'Joindre un vocal'}
                  taille={40}
                  tailleIcone={18}
                  onPress={() => void ouvrirEnregistreur()}
                />
                {/* Bouton « Surprise » (décorer la lettre) : masqué jusqu'aux finitions. */}
                <View style={styles.espace} />
                <Texte variante="labelS" couleur={couleurs.texte.encreDouce} accessible={false}>
                  Manuscrit
                </Texte>
                <Interrupteur
                  libelle="Écriture manuscrite"
                  actif={champs.manuscrit}
                  onChange={(manuscrit) => modifier({ manuscrit })}
                />
              </View>
            </View>
          </View>

          {erreurMedia ? <Alerte message={erreurMedia} /> : null}
          {photoEnEchec ? (
            <BandeauInfo
              Icone={Photo}
              message="La photo n’est pas partie."
              action={{ libelle: 'Réessayer', onPress: () => void envoyerPhoto(photoEnEchec) }}
            />
          ) : null}

          <Champ
            libelle="Indice (visible avant l’ouverture)"
            icone={Apercu}
            value={champs.indice}
            onChangeText={(indice) => modifier({ indice })}
            maxLength={LIMITES.indice}
            placeholder="Il est question de météo…"
          />
          <Champ
            libelle="Titre (visible de toi seul)"
            value={champs.titre}
            onChangeText={(titre) => modifier({ titre })}
            maxLength={LIMITES.titre}
            placeholder="Pour un jour de pluie"
          />

          {brouillon.touche || brouillon.id ? (
            <EtatEnregistrement etat={brouillon.etat} erreur={brouillon.erreur} />
          ) : null}
          {message ? <Alerte message={message} /> : null}
          {brouillon.id ? (
            <Bouton
              libelle={initial.programmation ? 'Supprimer ce mot' : 'Supprimer ce brouillon'}
              Icone={Corbeille}
              variante="discret"
              pleineLargeur
              onPress={() => void supprimer()}
            />
          ) : null}
        </>
      )}
    </Ecran>
  )
}

function descriptionProgrammation(p: MotProgramme['programmation']) {
  switch (p.mode) {
    case 'date':
      return `Programmé pour le ${libellesJour(p.jour).long}.`
    case 'semaine_hasard':
      return `Programmé quelque part entre le ${libellesJour(p.debut).date} et le ${libellesJour(p.fin).date}.`
    case 'ouvre_quand':
      return `Lettre « Ouvre quand ${p.titre} ».`
  }
}

function EtatEnregistrement({ etat, erreur }: { etat: EtatSauvegarde; erreur: string | null }) {
  if (etat === 'erreur' && erreur) return <Alerte message={`Pas encore enregistré : ${erreur}`} />
  const texte: Record<EtatSauvegarde, string> = {
    vide: 'Un mot vide n’est pas enregistré.',
    modifie: 'Modifications en attente…',
    enCours: 'Enregistrement…',
    enregistre: 'Enregistré.',
    erreur: '',
  }
  return (
    <Texte
      variante="corpsS"
      couleur={couleurs.texte.encreDouce}
      style={styles.etat}
      accessibilityLiveRegion="polite"
    >
      {texte[etat]}
    </Texte>
  )
}

const styles = StyleSheet.create({
  types: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  carte: {
    overflow: 'hidden',
    borderRadius: rayons.carte,
    borderWidth: 1,
    borderColor: couleurs.trait.ligne,
    backgroundColor: couleurs.fond.carte,
  },
  feuille: {
    gap: 10,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 22,
  },
  saisie: {
    minHeight: 102,
    color: couleurs.texte.encre,
    textAlignVertical: 'top',
    padding: 0,
    backgroundColor: 'transparent',
    outlineWidth: 0,
    outlineColor: 'transparent',
  },
  manuscrit: {
    fontFamily: familles.manuscrit,
    fontSize: typo.manuscritL.fontSize,
    lineHeight: typo.manuscritL.lineHeight,
  },
  clavier: {
    fontFamily: familles.corps,
    fontSize: typo.corpsM.fontSize,
    lineHeight: typo.corpsM.lineHeight,
  },
  media: {
    gap: 8,
  },
  outils: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  espace: {
    flex: 1,
  },
  etat: {
    textAlign: 'center',
  },
})
