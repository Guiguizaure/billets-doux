import { createElement, useState } from 'react'
import { StyleSheet, useWindowDimensions, View } from 'react-native'

import Coeur from '@/assets/icons/Coeur.svg'
import TimbreLune from '@/assets/illustrations/timbre-lune.svg'
import { Alerte } from '@/components/Alerte'
import { Bouton } from '@/components/Bouton'
import { LienTexte } from '@/components/LienTexte'
import { Texte } from '@/components/Texte'
import { messageErreur } from '@/lib/formulaires'
import { useSession } from '@/session/SessionProvider'
import { couleurs } from '@/theme/tokens'

import { CadreTelephone, ECRAN, type VarianteCadre } from './CadreTelephone'

/** Au-delà de cette largeur, la version web se présente dans un cadre de téléphone. */
export const LARGEUR_CADRE = 700

/**
 * Version web sur grand écran (portfolio) : une phrase de présentation, un bouton qui ouvre
 * le duo de démo, et l'appli elle-même dans un cadre de téléphone. L'appli tourne dans une
 * iframe de même origine : ses feuilles et boîtes de dialogue restent dans le cadre.
 */
export function PageDemo({
  variante,
  chemin,
  echelle,
}: {
  variante: VarianteCadre
  /** Écran ouvert dans le cadre au chargement. */
  chemin: string
  /** Aperçu réduit (page de test) ; sinon, ajusté à la hauteur de la fenêtre. */
  echelle?: number
}) {
  const { moi, connecterDemo, deconnecter } = useSession()
  const { height } = useWindowDimensions()
  const [version, setVersion] = useState(0)
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const enDemo = Boolean(moi?.utilisateur.demo)
  const taille = echelle ?? Math.min(1, (height - 48) / (ECRAN.hauteur + 30))

  const decouvrir = async () => {
    setEnCours(true)
    setErreur(null)
    try {
      await connecterDemo()
      setVersion((v) => v + 1)
    } catch (e) {
      setErreur(messageErreur(e))
    } finally {
      setEnCours(false)
    }
  }

  const quitter = async () => {
    await deconnecter()
    setVersion((v) => v + 1)
  }

  return (
    <View style={[styles.page, echelle ? styles.apercu : null]}>
      <View style={[styles.contenu, { transform: [{ scale: taille }] }]}>
        <View style={styles.presentation}>
          <TimbreLune width={72} height={88} />
          <Texte variante="titreXL" accessibilityRole="header">
            Billets doux
          </Texte>
          <Texte variante="corpsM" couleur={couleurs.texte.encreDouce}>
            Billets doux, une appli mobile pour deux. Version web de démonstration.
          </Texte>
          {enDemo ? (
            <>
              <Texte variante="corpsS" couleur={couleurs.texte.encreDouce}>
                Tu explores le duo de Léo et Lina, du côté de Léo. Tout revient à zéro chaque nuit.
              </Texte>
              <LienTexte libelle="Quitter la démo" onPress={() => void quitter()} />
            </>
          ) : (
            <Bouton
              libelle="Découvrir avec un duo de démo"
              Icone={Coeur}
              enCours={enCours}
              onPress={() => void decouvrir()}
            />
          )}
          {erreur ? <Alerte message={erreur} /> : null}
        </View>
        <CadreTelephone variante={variante}>
          {createElement('iframe', {
            key: version,
            src: chemin,
            title: 'Billets doux',
            style: { border: 0, width: '100%', height: '100%' },
          })}
        </CadreTelephone>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: couleurs.fond.papierOmbre,
  },
  // Aperçu à taille fixe (page de test). Base « auto » : sur le web, celle de 0 % héritée de
  // `flex: 1` écraserait la hauteur.
  apercu: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 'auto',
    width: 880,
    height: 920,
  },
  contenu: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 64,
  },
  presentation: {
    width: 320,
    gap: 16,
    alignItems: 'flex-start',
  },
})
