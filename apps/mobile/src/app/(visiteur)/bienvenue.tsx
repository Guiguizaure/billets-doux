import { router } from 'expo-router'
import { StyleSheet, View } from 'react-native'

import Cadenas from '@/assets/icons/Cadenas.svg'
import Coeur from '@/assets/icons/Coeur.svg'
import Mot from '@/assets/icons/Mot.svg'
import Plume from '@/assets/icons/Plume.svg'
import OiseauMessager from '@/assets/illustrations/oiseau-messager.svg'
import { Bouton } from '@/components/Bouton'
import { BoutonRond } from '@/components/BoutonRond'
import { Ecran } from '@/components/Ecran'
import { LienTexte } from '@/components/LienTexte'
import { Texte } from '@/components/Texte'
import { couleurs } from '@/theme/tokens'

const promesses = [
  { texte: 'Tu écris quand tu y penses', Icone: Plume, fond: couleurs.decor.rose },
  { texte: 'Ça reste scellé', Icone: Cadenas, fond: couleurs.decor.lavande },
  { texte: 'S’ouvre le jour J', Icone: Coeur, fond: couleurs.decor.soleil },
]

/** Écran 1.1 Bienvenue. */
export default function Bienvenue() {
  return (
    <Ecran
      actions={
        <>
          <Bouton libelle="Commencer" pleineLargeur onPress={() => router.push('/inscription')} />
          <Bouton
            libelle="J’ai reçu une invitation"
            variante="secondaire"
            Icone={Mot}
            pleineLargeur
            onPress={() => router.push('/rejoindre')}
          />
          <LienTexte libelle="J’ai déjà un compte" onPress={() => router.push('/connexion')} />
        </>
      }
    >
      <View style={styles.contenu}>
        {/* Illu/oiseau-messager (240 × 200) affichée à 125 %, comme dans la maquette. */}
        <OiseauMessager width={300} height={250} />
        <Texte variante="titreXL" style={styles.centre} accessibilityRole="header">
          Billets doux
        </Texte>
        <Texte variante="corpsM" couleur={couleurs.texte.encreDouce} style={styles.accroche}>
          Un calendrier de petits mots, préparés à l’avance pour une seule personne.
        </Texte>
        <View style={styles.promesses}>
          {promesses.map(({ texte, Icone, fond }) => (
            <View key={texte} style={styles.promesse}>
              <BoutonRond Icone={Icone} fond={fond} />
              <Texte variante="labelS" style={styles.centre}>
                {texte}
              </Texte>
            </View>
          ))}
        </View>
        {__DEV__ ? (
          <LienTexte libelle="Page de test (développement)" onPress={() => router.push('/lab')} />
        ) : null}
      </View>
    </Ecran>
  )
}

const styles = StyleSheet.create({
  contenu: {
    alignItems: 'center',
    gap: 20,
    paddingTop: 30,
  },
  centre: {
    textAlign: 'center',
  },
  accroche: {
    textAlign: 'center',
    maxWidth: 300,
  },
  promesses: {
    flexDirection: 'row',
    gap: 12,
  },
  promesse: {
    width: 104,
    alignItems: 'center',
    gap: 8,
  },
})
