import { router } from 'expo-router'
import Head from 'expo-router/head'
import { StyleSheet, View } from 'react-native'

import BordureParAvion from '@/assets/illustrations/bordure-par-avion.svg'
import { Bouton } from '@/components/Bouton'
import { Ecran } from '@/components/Ecran'
import { EnTete } from '@/components/EnTete'
import { Texte } from '@/components/Texte'
import { couleurs, rayons } from '@/theme/tokens'

/** Écran d'exemple ouvert avec une transition donnée (page de test). */
export function EcranTransition({ nom }: { nom: string }) {
  const revenir = () => (router.canGoBack() ? router.back() : router.replace('/lab'))
  return (
    <Ecran
      enTete={<EnTete titre={`Transition : ${nom}`} retour={revenir} />}
      actions={<Bouton libelle="Revenir" variante="secondaire" pleineLargeur onPress={revenir} />}
    >
      <Head>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <View style={styles.lettre}>
        <BordureParAvion width="100%" height={8.5} preserveAspectRatio="none" />
        <View style={styles.contenu}>
          <Texte variante="labelS" couleur={couleurs.texte.encreDouce}>
            MARDI 13 OCTOBRE
          </Texte>
          <Texte variante="manuscritL">Bonjour toi, j’ai rêvé de la mer</Texte>
        </View>
      </View>
    </Ecran>
  )
}

const styles = StyleSheet.create({
  lettre: {
    overflow: 'hidden',
    borderRadius: rayons.carte,
    borderWidth: 1,
    borderColor: couleurs.trait.ligne,
    backgroundColor: couleurs.fond.carte,
  },
  contenu: {
    gap: 12,
    padding: 20,
  },
})
