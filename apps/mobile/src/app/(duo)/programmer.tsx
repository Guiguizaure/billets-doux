import {
  type CalendrierAuteur,
  formaterHeure,
  libellesJour,
  type MotProgramme,
  type Programmation,
  semaineAuHasard,
  SUGGESTIONS_OUVRE_QUAND,
  TITRE_OUVRE_QUAND_MAX,
} from '@billets-doux/shared'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, useWindowDimensions, View } from 'react-native'

import Horloge from '@/assets/icons/Horloge.svg'
import Valider from '@/assets/icons/Valider.svg'
import { Alerte } from '@/components/Alerte'
import { Bouton } from '@/components/Bouton'
import { CalendrierMois } from '@/components/CalendrierMois'
import { Champ } from '@/components/Champ'
import { Ecran } from '@/components/Ecran'
import { EnTete } from '@/components/EnTete'
import { LienTexte } from '@/components/LienTexte'
import { Puce } from '@/components/Puce'
import { Segments } from '@/components/Segments'
import { Texte } from '@/components/Texte'
import { api } from '@/lib/client'
import { messageErreur } from '@/lib/formulaires'
import { messageFlash } from '@/lib/messageFlash'
import { vibrer } from '@/lib/vibrer'
import { couleurs, rayons } from '@/theme/tokens'

type Mode = Programmation['mode']

const revenir = () => (router.canGoBack() ? router.back() : router.replace('/pour-toi'))

/** La fenêtre de 7 jours d'un mot « Dans la semaine », vue d'aujourd'hui (indicatif). */
const fenetreAuHasard = (fuseau: string) => semaineAuHasard(new Date(), fuseau)

/**
 * Écran 3.5 Quand l'ouvrir ? `?id=` : le mot à programmer ; `?jour=` ou `?mode=ouvre_quand`
 * présélectionnent un choix (case libre touchée, lettre « Ouvre quand… »).
 */
export default function Programmer() {
  const params = useLocalSearchParams<{ id?: string; jour?: string; mode?: string }>()
  const [cal, setCal] = useState<CalendrierAuteur | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)

  useEffect(() => {
    let annule = false
    api
      .calendrier()
      .then((c) => {
        if (!annule) setCal(c)
      })
      .catch((e: unknown) => {
        if (!annule) setErreur(messageErreur(e))
      })
    return () => {
      annule = true
    }
  }, [])

  if (!params.id) {
    return (
      <Ecran enTete={<EnTete titre="Quand l’ouvrir ?" retour={revenir} />}>
        <Alerte message="Aucun mot à programmer." />
      </Ecran>
    )
  }
  if (!cal) {
    return (
      <Ecran enTete={<EnTete titre="Quand l’ouvrir ?" retour={revenir} />}>
        {erreur ? <Alerte message={erreur} /> : <ActivityIndicator color={couleurs.texte.encre} />}
      </Ecran>
    )
  }
  return (
    <Formulaire
      cal={cal}
      motId={params.id}
      actuel={cal.mots.find((m) => m.id === params.id) ?? null}
      jourDemande={params.jour ?? null}
      modeDemande={params.mode === 'ouvre_quand' ? 'ouvre_quand' : null}
    />
  )
}

function Formulaire({
  cal,
  motId,
  actuel,
  jourDemande,
  modeDemande,
}: {
  cal: CalendrierAuteur
  motId: string
  actuel: MotProgramme | null
  jourDemande: string | null
  modeDemande: Mode | null
}) {
  const { width } = useWindowDimensions()
  const prenom = cal.destinataire.prenom
  const programmation = actuel?.programmation ?? null

  const jourInitial =
    jourDemande ?? (programmation?.mode === 'date' ? programmation.jour : cal.premierJour)
  const [mode, setMode] = useState<Mode>(modeDemande ?? programmation?.mode ?? 'date')
  const [jour, setJour] = useState<string>(
    jourInitial < cal.premierJour ? cal.premierJour : jourInitial,
  )
  const [vue, setVue] = useState(() => {
    const l = libellesJour(jour)
    return { annee: l.annee, mois: l.mois }
  })
  const [titre, setTitre] = useState(
    programmation?.mode === 'ouvre_quand' ? programmation.titre : '… ',
  )
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  // « Dans la semaine » tient sur une ligne seulement si le segment est assez large.
  const largeurSegment = (Math.min(width, 480) - 40 - 16) / 3
  const options: { valeur: Mode; libelle: string }[] = [
    { valeur: 'date', libelle: 'Jour précis' },
    {
      valeur: 'semaine_hasard',
      libelle: largeurSegment >= 108 ? 'Dans la semaine' : 'Cette semaine',
    },
    { valeur: 'ouvre_quand', libelle: 'Ouvre quand' },
  ]

  const joursPris = new Set(
    cal.mots
      .filter((m) => m.id !== motId && m.programmation.mode === 'date')
      .map((m) => (m.programmation.mode === 'date' ? m.programmation.jour : '')),
  )
  const heure = formaterHeure(cal.destinataire.heureDecouverte)
  const semaine = fenetreAuHasard(cal.destinataire.fuseauHoraire)

  const libelleAction =
    mode === 'date'
      ? `Programmer pour ${libellesJour(jour).court}`
      : mode === 'semaine_hasard'
        ? 'Programmer dans la semaine'
        : 'Ranger la lettre'

  const valider = async () => {
    setErreur(null)
    const choix: Programmation =
      mode === 'date'
        ? { mode, jour }
        : mode === 'semaine_hasard'
          ? { mode }
          : { mode, titre: titre.trim() }
    if (choix.mode === 'ouvre_quand' && choix.titre.replace(/^…\s*/, '').length === 0) {
      setErreur('Écris la fin de la phrase : « Ouvre quand… tu as besoin de rire ».')
      return
    }
    setEnCours(true)
    try {
      await api.programmer(motId, choix)
      vibrer.programme()
      // Le tampon « Programmé pour… » attend sur le calendrier.
      if (choix.mode === 'date') {
        messageFlash.deposer(`Programmé pour ${libellesJour(choix.jour).court} à ${heure}`)
      } else if (choix.mode === 'semaine_hasard') {
        messageFlash.deposer(`Programmé dans la semaine, à ${heure}`)
      }
      router.dismissTo(choix.mode === 'ouvre_quand' ? '/ouvre-quand' : '/pour-toi')
    } catch (e) {
      setErreur(messageErreur(e))
      setEnCours(false)
    }
  }

  const remettre = async () => {
    try {
      await api.remettreEnReserve(motId)
      router.dismissTo('/reserve')
    } catch (e) {
      setErreur(messageErreur(e))
    }
  }

  return (
    <Ecran
      enTete={<EnTete titre="Quand l’ouvrir ?" retour={revenir} />}
      actions={
        <Bouton
          libelle={libelleAction}
          Icone={Valider}
          pleineLargeur
          enCours={enCours}
          onPress={() => void valider()}
        />
      }
    >
      <Segments
        libelle="Mode de programmation"
        options={options}
        valeur={mode}
        onChange={setMode}
      />

      {mode === 'date' ? (
        <>
          <CalendrierMois
            annee={vue.annee}
            mois={vue.mois}
            onMois={(annee, mois) => setVue({ annee, mois })}
            selection={jour}
            onSelection={setJour}
            aujourdhui={cal.aujourdhui}
            premierJour={cal.premierJour}
            dernierJour={cal.dernierJour}
            joursPris={joursPris}
          />
          <View style={styles.heure}>
            <Horloge width={18} height={18} color={couleurs.texte.encreDouce} />
            <Texte variante="corpsS" couleur={couleurs.texte.encreDouce}>
              S’ouvrira à {heure}, l’heure choisie par {prenom}
            </Texte>
          </View>
        </>
      ) : mode === 'semaine_hasard' ? (
        <View style={styles.carte}>
          <Texte variante="titreItaliqueL">quelque part cette semaine…</Texte>
          <Texte variante="corpsM" couleur={couleurs.texte.encreDouce}>
            Un jour tiré au hasard entre le {libellesJour(semaine.debut).long} et le{' '}
            {libellesJour(semaine.fin).long}, à {heure}. Même toi, tu ne sauras pas lequel.
          </Texte>
        </View>
      ) : (
        <>
          <Texte variante="corpsS" couleur={couleurs.texte.encreDouce}>
            Une lettre sans date : {prenom} pourra l’ouvrir au moment voulu, une seule fois.
          </Texte>
          <Champ
            libelle="Ouvre quand…"
            value={titre}
            onChangeText={setTitre}
            maxLength={TITRE_OUVRE_QUAND_MAX}
            placeholder="… tu as besoin de rire"
          />
          <View style={styles.suggestions} accessibilityLabel="Suggestions">
            {SUGGESTIONS_OUVRE_QUAND.map((s) => (
              <Puce key={s} libelle={s} active={titre === s} onPress={() => setTitre(s)} />
            ))}
          </View>
        </>
      )}

      {erreur ? <Alerte message={erreur} /> : null}
      {actuel?.statut === 'programme' ? (
        <LienTexte libelle="Remettre dans la réserve" onPress={() => void remettre()} />
      ) : null}
    </Ecran>
  )
}

const styles = StyleSheet.create({
  heure: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  carte: {
    gap: 10,
    padding: 20,
    borderRadius: rayons.carte,
    borderWidth: 1,
    borderColor: couleurs.trait.ligne,
    backgroundColor: couleurs.fond.carte,
  },
  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
})
