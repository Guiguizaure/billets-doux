import { getHealth } from '@billets-doux/shared'
import { useEffect, useState } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Bouton } from '@/components/Bouton'
import { Texte } from '@/components/Texte'
import { apiUrl } from '@/lib/api'
import { couleurs, rayons } from '@/theme/tokens'

type EtatApi = { statut: 'chargement' } | { statut: 'ok'; db: boolean } | { statut: 'erreur' }

/** Accueil provisoire (étape 1) : vérifie la chaîne appli → shared → API → Mongo. */
export default function Accueil() {
  const [etat, setEtat] = useState<EtatApi>({ statut: 'chargement' })
  const [tentative, setTentative] = useState(0)

  useEffect(() => {
    let annule = false
    getHealth(apiUrl())
      .then((res) => !annule && setEtat({ statut: 'ok', db: res.db }))
      .catch(() => !annule && setEtat({ statut: 'erreur' }))
    return () => {
      annule = true
    }
  }, [tentative])

  const reessayer = () => {
    setEtat({ statut: 'chargement' })
    setTentative((t) => t + 1)
  }

  const message =
    etat.statut === 'chargement'
      ? 'Connexion à l’API…'
      : etat.statut === 'erreur'
        ? 'API injoignable'
        : etat.db
          ? 'API joignable, base de données OK'
          : 'API joignable, base de données indisponible'
  const pastille =
    etat.statut === 'ok' && etat.db
      ? couleurs.decor.sauge
      : etat.statut === 'chargement'
        ? couleurs.trait.ligne
        : couleurs.decor.corail

  return (
    <SafeAreaView style={styles.ecran}>
      <ScrollView contentContainerStyle={styles.contenu}>
        <Texte variante="labelS" couleur={couleurs.texte.encreDouce}>
          BÊTA · ÉTAPE 1
        </Texte>
        <Texte variante="titreXL" accessibilityRole="header">
          Billets doux
        </Texte>
        <Texte variante="corpsM" couleur={couleurs.texte.encreDouce}>
          Prépare tes mots à l’avance : ils s’ouvriront le jour choisi.
        </Texte>

        <View style={styles.carte} accessible accessibilityLabel={`État de l’API : ${message}`}>
          <Texte variante="labelM">État de l’API</Texte>
          <View style={styles.ligne}>
            <View style={[styles.pastille, { backgroundColor: pastille }]} />
            <Texte variante="corpsM">{message}</Texte>
          </View>
          <Texte variante="corpsS" couleur={couleurs.texte.encreDouce}>
            {apiUrl()}
          </Texte>
        </View>
        {etat.statut !== 'chargement' && (
          <Bouton libelle="Réessayer" variante="discret" onPress={reessayer} />
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  ecran: {
    flex: 1,
    backgroundColor: couleurs.fond.papier,
  },
  contenu: {
    gap: 16,
    padding: 24,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  carte: {
    gap: 8,
    marginTop: 16,
    padding: 16,
    borderRadius: rayons.case,
    borderWidth: 1,
    borderColor: couleurs.trait.ligne,
    backgroundColor: couleurs.fond.carte,
  },
  ligne: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pastille: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
})
