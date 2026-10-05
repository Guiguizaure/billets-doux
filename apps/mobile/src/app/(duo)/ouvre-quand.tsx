import {
  type CalendrierAuteur,
  libellesJour,
  jourLocal,
  type MotProgramme,
} from '@billets-doux/shared'
import { router, useFocusEffect } from 'expo-router'
import type { FC } from 'react'
import { useCallback, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native'
import type { SvgProps } from 'react-native-svg'

import Cadenas from '@/assets/icons/Cadenas.svg'
import Coeur from '@/assets/icons/Coeur.svg'
import Joker from '@/assets/icons/Joker.svg'
import Lune from '@/assets/icons/Lune.svg'
import Plume from '@/assets/icons/Plume.svg'
import Plus from '@/assets/icons/Plus.svg'
import Surprise from '@/assets/icons/Surprise.svg'
import Valider from '@/assets/icons/Valider.svg'
import LuneDormeuse from '@/assets/illustrations/lune-dormeuse.svg'
import { Alerte } from '@/components/Alerte'
import { Bouton } from '@/components/Bouton'
import { BoutonRond } from '@/components/BoutonRond'
import { Ecran } from '@/components/Ecran'
import { EnTete } from '@/components/EnTete'
import { Texte } from '@/components/Texte'
import { api } from '@/lib/client'
import { messageErreur } from '@/lib/formulaires'
import { TYPES_DE_MOT } from '@/lib/typesDeMot'
import { couleurs, rayons } from '@/theme/tokens'

/** Icônes des lettres, en rotation (comme dans la maquette). */
const ICONES: FC<SvgProps>[] = [Lune, Coeur, Surprise, Joker]

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
              Icone={ICONES[i % ICONES.length] ?? Lune}
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
  Icone,
  fuseau,
}: {
  lettre: MotProgramme
  Icone: FC<SvgProps>
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
    ? `ouverte le ${libellesJour(jourLocal(new Date(lettre.ouvertLe), fuseau)).date}`
    : 'prête'
  const ouverte = Boolean(lettre.ouvertLe)

  return (
    <Pressable
      onPress={
        ouverte ? undefined : () => router.push({ pathname: '/ecrire', params: { id: lettre.id } })
      }
      disabled={ouverte}
      accessibilityRole={ouverte ? undefined : 'button'}
      accessibilityLabel={`Ouvre quand ${titre}. ${contenu}, ${etat}.`}
      style={({ pressed }) => [styles.carte, ouverte && styles.ouverte, pressed && styles.presse]}
    >
      {ouverte ? (
        <View style={styles.rondOuvert}>
          <Icone width={20} height={20} color={couleurs.texte.encre} />
        </View>
      ) : (
        <BoutonRond Icone={Icone} fond={couleurs.decor.lavande} />
      )}
      <View style={styles.texte}>
        <Texte variante="labelS" couleur={couleurs.texte.encreDouce}>
          Ouvre quand
        </Texte>
        <Texte variante="manuscritM">{titre}</Texte>
        <Texte variante="corpsS" couleur={couleurs.texte.encreDouce}>
          {contenu} · {etat}
        </Texte>
      </View>
      {ouverte ? (
        <Valider width={20} height={20} color={couleurs.texte.encreDouce} />
      ) : (
        <Cadenas width={20} height={20} color={couleurs.texte.encre} />
      )}
    </Pressable>
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
  // Validé à l'étape 4 : pas de texte sur une couleur de décor, la lavande reste dans la pastille.
  carte: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: rayons.carte,
    borderWidth: 1,
    borderColor: couleurs.trait.ligne,
    backgroundColor: couleurs.fond.carte,
  },
  ouverte: {
    backgroundColor: couleurs.fond.papierOmbre,
  },
  presse: {
    opacity: 0.8,
  },
  rondOuvert: {
    width: 44,
    height: 44,
    borderRadius: rayons.pilule,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: couleurs.trait.ligne,
    backgroundColor: couleurs.fond.carte,
  },
  texte: {
    flex: 1,
    gap: 2,
  },
})
