import {
  type CalendrierAuteur,
  libellesJour,
  jourLocal,
  type MotProgramme,
} from '@billets-doux/shared'
import { router, useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'

import Plume from '@/assets/icons/Plume.svg'
import Plus from '@/assets/icons/Plus.svg'
import LuneDormeuse from '@/assets/illustrations/lune-dormeuse.svg'
import { Alerte } from '@/components/Alerte'
import { Bouton } from '@/components/Bouton'
import { CarteOuvreQuand, iconeLettre } from '@/components/CarteOuvreQuand'
import { Ecran } from '@/components/Ecran'
import { EnTete } from '@/components/EnTete'
import { Texte } from '@/components/Texte'
import { api } from '@/lib/client'
import { messageErreur } from '@/lib/formulaires'
import { TYPES_DE_MOT } from '@/lib/typesDeMot'
import { couleurs } from '@/theme/tokens'

const revenir = () => (router.canGoBack() ? router.back() : router.replace('/pour-toi'))

/** Écran 3.6 Lettres « Ouvre quand… » (vues par l'auteur). */
export default function OuvreQuand() {
  const [cal, setCal] = useState<CalendrierAuteur | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)

  useFocusEffect(
    useCallback(() => {
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
    }, []),
  )

  const ecrire = () => router.push({ pathname: '/ecrire', params: { mode: 'ouvre_quand' } })
  // Ordre de création : chaque lettre garde la même icône quand d'autres s'ajoutent.
  const lettres = (cal?.mots.filter((m) => m.programmation.mode === 'ouvre_quand') ?? []).sort(
    (a, b) => a.creeLe.localeCompare(b.creeLe),
  )

  return (
    <Ecran
      enTete={
        <EnTete
          titre="Ouvre quand…"
          retour={revenir}
          action={{ Icone: Plus, libelle: 'Nouvelle lettre', onPress: ecrire }}
        />
      }
      actions={
        <Bouton
          libelle="Écrire une lettre Ouvre quand"
          Icone={Plume}
          pleineLargeur
          onPress={ecrire}
        />
      }
    >
      <View style={styles.intro}>
        {/* Illu/lune-dormeuse (180 × 180) à 70 %, comme dans la maquette. */}
        <LuneDormeuse width={126} height={126} />
        <Texte variante="corpsS" couleur={couleurs.texte.encreDouce} style={styles.centre}>
          Des lettres sans date. {cal?.destinataire.prenom ?? 'Ta personne'} les ouvre au moment
          voulu, une seule fois chacune.
        </Texte>
      </View>
      {erreur ? <Alerte message={erreur} /> : null}
      {!cal ? (
        <ActivityIndicator color={couleurs.texte.encre} />
      ) : lettres.length === 0 ? (
        <Texte variante="manuscritM" style={styles.centre}>
          Aucune lettre pour l’instant.
        </Texte>
      ) : (
        <View style={styles.liste}>
          {lettres.map((lettre, i) => (
            <CarteLettre
              key={lettre.id}
              lettre={lettre}
              rang={i}
              fuseau={cal.destinataire.fuseauHoraire}
            />
          ))}
        </View>
      )}
    </Ecran>
  )
}

function CarteLettre({
  lettre,
  rang,
  fuseau,
}: {
  lettre: MotProgramme
  rang: number
  fuseau: string
}) {
  const titre = lettre.programmation.mode === 'ouvre_quand' ? lettre.programmation.titre : ''
  const contenu = [
    TYPES_DE_MOT[lettre.type].libelle.toLowerCase(),
    lettre.photo && lettre.type !== 'photo' ? 'photo' : null,
    lettre.vocal && lettre.type !== 'vocal' ? 'vocal' : null,
  ]
    .filter(Boolean)
    .join(' et ')
  const etat = lettre.ouvertLe
    ? `ouverte le ${libellesJour(jourLocal(new Date(lettre.ouvertLe), fuseau)).date}${lettre.reponse?.texte || lettre.reponse?.vocal ? ', répondu' : ''}`
    : 'prête'

  return (
    <CarteOuvreQuand
      titre={titre}
      details={`${contenu} · ${etat}`}
      ouverte={Boolean(lettre.ouvertLe)}
      Icone={iconeLettre(rang)}
      // Ouverte : on la relit avec la réponse ; sinon on peut encore la modifier.
      onPress={() =>
        lettre.ouvertLe
          ? router.push({ pathname: '/mot/[id]', params: { id: lettre.id } })
          : router.push({ pathname: '/ecrire', params: { id: lettre.id } })
      }
    />
  )
}

const styles = StyleSheet.create({
  intro: {
    alignItems: 'center',
    gap: 12,
  },
  centre: {
    textAlign: 'center',
  },
  liste: {
    gap: 12,
  },
})
