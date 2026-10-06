import { type CalendrierAuteur, ecartEnJours, jourLocal, libellesJour } from '@billets-doux/shared'
import { router, useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'

import Calendrier from '@/assets/icons/Calendrier.svg'
import Plume from '@/assets/icons/Plume.svg'
import SablierEtoile from '@/assets/illustrations/sablier-etoile.svg'
import { Alerte } from '@/components/Alerte'
import { Bouton } from '@/components/Bouton'
import { Ecran } from '@/components/Ecran'
import { EnTete } from '@/components/EnTete'
import { FeuilleRetrouvailles } from '@/components/FeuilleRetrouvailles'
import { Texte } from '@/components/Texte'
import { api } from '@/lib/client'
import { messageErreur } from '@/lib/formulaires'
import { friseRetrouvailles, type JourFrise } from '@/lib/retrouvailles'
import { useSession } from '@/session/SessionProvider'
import { familles } from '@/theme/polices'
import { couleurs, rayons } from '@/theme/tokens'

const revenir = () => (router.canGoBack() ? router.back() : router.replace('/pour-toi'))

const COULEUR: Record<JourFrise['etat'], object> = {
  pret: { backgroundColor: couleurs.decor.sauge },
  a_remplir: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: couleurs.trait.ligne },
  passe: { backgroundColor: couleurs.trait.ligne },
  jour_j: { backgroundColor: couleurs.decor.soleil },
}

/** Écran 4.1 Compte à rebours des retrouvailles. */
export default function Retrouvailles() {
  const { moi } = useSession()
  const jourJ = moi?.duo?.retrouvailles ?? null
  const [cal, setCal] = useState<CalendrierAuteur | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [feuille, setFeuille] = useState(false)

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

  const enTete = <EnTete titre="Retrouvailles" retour={revenir} />

  if (!jourJ) {
    return (
      <Ecran
        enTete={enTete}
        actions={
          <Bouton
            libelle="Choisir la date"
            Icone={Calendrier}
            pleineLargeur
            onPress={() => setFeuille(true)}
          />
        }
      >
        <View style={styles.contenu}>
          <SablierEtoile width={112} height={154} />
          <Texte variante="titreM" style={styles.centre}>
            Pas encore de date pour se revoir
          </Texte>
        </View>
        {feuille ? <FeuilleRetrouvailles visible onFermer={() => setFeuille(false)} /> : null}
      </Ecran>
    )
  }

  const aujourdhui = jourLocal(new Date(), moi?.utilisateur.fuseauHoraire ?? 'Europe/Paris')
  const reste = Math.max(0, ecartEnJours(aujourdhui, jourJ))
  const frise = cal ? friseRetrouvailles(cal, jourJ) : null
  const prenom = cal?.destinataire.prenom ?? moi?.duo?.partenaire?.prenom ?? ''

  return (
    <Ecran
      enTete={enTete}
      actions={
        <>
          {frise && frise.premierARemplir ? (
            <Bouton
              libelle={`Remplir ${frise.aRemplir > 1 ? `les ${frise.aRemplir} cases vides` : 'la case vide'}`}
              Icone={Plume}
              pleineLargeur
              onPress={() =>
                router.push({ pathname: '/ecrire', params: { jour: frise.premierARemplir! } })
              }
            />
          ) : null}
          <Bouton
            libelle="Changer la date"
            variante="discret"
            pleineLargeur
            onPress={() => setFeuille(true)}
          />
        </>
      }
    >
      <View style={styles.contenu}>
        {/* Illu/sablier-etoile (160 × 220) à 70 %, comme dans la maquette. */}
        <SablierEtoile width={112} height={154} />
        {/* Grand chiffre en cachet sur papier : 4,3:1, suffisant pour un texte de 96 px. */}
        <Texte
          style={styles.chiffre}
          couleur={couleurs.action.cachet}
          accessibilityLabel={`${reste} jour${reste > 1 ? 's' : ''} avant de se revoir`}
        >
          {reste}
        </Texte>
        <Texte variante="titreM" style={styles.centre} accessible={false}>
          {reste === 0 ? 'c’est aujourd’hui !' : `jour${reste > 1 ? 's' : ''} avant de se revoir`}
        </Texte>
        <View style={styles.date}>
          <Calendrier width={16} height={16} color={couleurs.texte.encreDouce} />
          <Texte variante="labelM" couleur={couleurs.texte.encreDouce}>
            {libellesJour(jourJ).long}
          </Texte>
        </View>
      </View>

      {erreur ? <Alerte message={erreur} /> : null}

      {!frise ? (
        erreur ? null : (
          <ActivityIndicator color={couleurs.texte.encre} />
        )
      ) : (
        <View style={styles.carte}>
          <Texte variante="labelM">Un mot chaque jour jusqu’à {prenom || 'toi'}</Texte>
          <View
            style={styles.frise}
            accessible
            accessibilityLabel={`${frise.prets} jour${frise.prets > 1 ? 's' : ''} prêt${frise.prets > 1 ? 's' : ''}, ${frise.aRemplir} à remplir`}
          >
            {frise.frise.map((j) => (
              <View key={j.jour} style={[styles.jour, COULEUR[j.etat]]} />
            ))}
          </View>
          <View style={styles.legende} accessible={false}>
            <Legende
              couleur={couleurs.decor.sauge}
              texte={`${frise.prets} prêt${frise.prets > 1 ? 's' : ''}`}
            />
            <Legende couleur={couleurs.trait.ligne} texte={`${frise.aRemplir} à remplir`} />
            <Legende couleur={couleurs.decor.soleil} texte="le jour J" />
          </View>
        </View>
      )}

      {feuille ? <FeuilleRetrouvailles visible onFermer={() => setFeuille(false)} /> : null}
    </Ecran>
  )
}

function Legende({ couleur, texte }: { couleur: string; texte: string }) {
  return (
    <View style={styles.legendeItem}>
      <View style={[styles.point, { backgroundColor: couleur }]} />
      <Texte variante="corpsS" couleur={couleurs.texte.encreDouce}>
        {texte}
      </Texte>
    </View>
  )
}

const styles = StyleSheet.create({
  contenu: {
    alignItems: 'center',
    gap: 8,
  },
  centre: {
    textAlign: 'center',
  },
  chiffre: {
    fontFamily: familles.titre,
    fontSize: 96,
    lineHeight: 100,
  },
  date: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  carte: {
    gap: 12,
    padding: 19,
    borderRadius: rayons.carte,
    borderWidth: 1,
    borderColor: couleurs.trait.ligne,
    backgroundColor: couleurs.fond.carte,
  },
  frise: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  jour: {
    width: 14,
    height: 14,
    borderRadius: 4,
  },
  legende: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  legendeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  point: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
})
