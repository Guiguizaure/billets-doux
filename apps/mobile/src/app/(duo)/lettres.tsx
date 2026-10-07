import { type CalendrierDestinataire, jourLocal, libellesJour } from '@billets-doux/shared'
import { router, useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'

import LuneDormeuse from '@/assets/illustrations/lune-dormeuse.svg'
import { Alerte } from '@/components/Alerte'
import { CarteOuvreQuand, iconeLettre } from '@/components/CarteOuvreQuand'
import { Ecran } from '@/components/Ecran'
import { EtatVide } from '@/components/EtatVide'
import { EnTete } from '@/components/EnTete'
import { Texte } from '@/components/Texte'
import { api } from '@/lib/client'
import { messageErreur } from '@/lib/formulaires'
import { TYPES_DE_MOT } from '@/lib/typesDeMot'
import { useSession } from '@/session/SessionProvider'
import { couleurs } from '@/theme/tokens'

const revenir = () => (router.canGoBack() ? router.back() : router.replace('/pour-moi'))

/**
 * Lettres « Ouvre quand… » reçues (façon 3.6). Une lettre fermée s'ouvre par le rituel
 * (2.3), à tout moment, sans joker ; une lettre ouverte se relit.
 */
export default function Lettres() {
  const { moi } = useSession()
  const fuseau = moi?.utilisateur.fuseauHoraire ?? 'Europe/Paris'
  const [cal, setCal] = useState<CalendrierDestinataire | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)

  useFocusEffect(
    useCallback(() => {
      let annule = false
      api
        .pourMoi()
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

  const prenom = cal?.expediteur.prenom ?? moi?.duo?.partenaire?.prenom ?? ''

  return (
    <Ecran enTete={<EnTete titre="Ouvre quand…" retour={revenir} />}>
      <View style={styles.intro}>
        {/* Illu/lune-dormeuse (180 × 180) à 70 %, comme en 3.6. */}
        <LuneDormeuse width={126} height={126} />
        <Texte variante="corpsS" couleur={couleurs.texte.encreDouce} style={styles.centre}>
          Des lettres de {prenom}, sans date. Ouvre-les au moment voulu, une seule fois chacune.
        </Texte>
      </View>
      {erreur ? <Alerte message={erreur} /> : null}
      {!cal ? (
        <ActivityIndicator color={couleurs.texte.encre} />
      ) : cal.lettres.length === 0 ? (
        <EtatVide
          titre="Aucune lettre pour l’instant"
          texte={`${prenom} peut t’écrire des lettres sans date, à ouvrir au moment voulu.`}
        />
      ) : (
        <View style={styles.liste}>
          {cal.lettres.map((lettre, i) => {
            const ouverte = lettre.etat === 'ouvert'
            const type = TYPES_DE_MOT[lettre.type].libelle.toLowerCase()
            const etat =
              ouverte && lettre.ouvertLe
                ? `ouverte le ${libellesJour(jourLocal(new Date(lettre.ouvertLe), fuseau)).date}`
                : 'à ouvrir quand tu veux'
            return (
              <CarteOuvreQuand
                key={lettre.id}
                titre={lettre.titre}
                details={`${type} · ${etat}`}
                ouverte={ouverte}
                Icone={iconeLettre(i)}
                onPress={() =>
                  router.push({
                    pathname: ouverte ? '/mot/[id]' : '/ouverture/[id]',
                    params: { id: lettre.id },
                  })
                }
              />
            )
          })}
        </View>
      )}
    </Ecran>
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
