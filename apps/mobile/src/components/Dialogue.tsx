import { createContext, type ReactNode, useCallback, useContext, useRef, useState } from 'react'
import { AccessibilityInfo, Modal, Platform, Pressable, StyleSheet, View } from 'react-native'

import { couleurs, rayons } from '@/theme/tokens'

import { Bouton } from './Bouton'
import { Texte } from './Texte'

export type DemandeConfirmation = {
  titre: string
  message: string
  /** Libellé du bouton Principal (rouge cachet) : un verbe court, « Supprimer », « Ouvrir ». */
  action: string
  /** Libellé du bouton Secondaire. */
  annuler?: string
}

type Confirmer = (demande: DemandeConfirmation) => Promise<boolean>

const Contexte = createContext<Confirmer | null>(null)

/** Les confirmations de l'appli : `const ok = await confirmer({ titre, message, action })`. */
export function useConfirmer() {
  const confirmer = useContext(Contexte)
  if (!confirmer) throw new Error('useConfirmer : DialogueProvider manquant')
  return confirmer
}

type EnCours = DemandeConfirmation & { resoudre: (ok: boolean) => void }

/** Une seule boîte à la fois, posée au-dessus de toute l'appli. */
export function DialogueProvider({ children }: { children: ReactNode }) {
  const [ouvert, setOuvert] = useState(false)
  // La dernière demande reste affichée pendant le fondu de fermeture.
  const [derniere, setDerniere] = useState<DemandeConfirmation | null>(null)
  const courant = useRef<EnCours | null>(null)

  const confirmer = useCallback<Confirmer>(
    (demande) =>
      new Promise<boolean>((resoudre) => {
        // Une nouvelle demande annule la précédente.
        courant.current?.resoudre(false)
        courant.current = { ...demande, resoudre }
        setDerniere(demande)
        setOuvert(true)
      }),
    [],
  )

  const repondre = useCallback((ok: boolean) => {
    courant.current?.resoudre(ok)
    courant.current = null
    setOuvert(false)
  }, [])

  return (
    <Contexte.Provider value={confirmer}>
      {children}
      <Dialogue ouvert={ouvert} demande={derniere} onRepondre={repondre} />
    </Contexte.Provider>
  )
}

/**
 * Boîte de confirmation aux couleurs du Figma : fond carte, titre en Instrument Serif,
 * Secondaire pour annuler, Principal (rouge cachet) pour confirmer.
 * Accessibilité : le focus reste dans la boîte (fenêtre à part sur Android, piège du Modal
 * sur le web, où « Annuler » reçoit le focus en premier) ; le bouton retour d'Android et
 * Échap sur le web annulent ; le lecteur d'écran annonce le titre et le message.
 */
function Dialogue({
  ouvert,
  demande,
  onRepondre,
}: {
  ouvert: boolean
  demande: DemandeConfirmation | null
  onRepondre: (ok: boolean) => void
}) {
  const annuler = useRef<View>(null)

  const aLOuverture = () => {
    if (demande) AccessibilityInfo.announceForAccessibility(`${demande.titre}. ${demande.message}`)
    // Web : le bouton qui a ouvert la boîte a pu disparaître ; le focus va sur « Annuler ».
    if (Platform.OS === 'web') annuler.current?.focus()
  }

  return (
    <Modal
      visible={ouvert}
      transparent
      animationType="fade"
      onRequestClose={() => onRepondre(false)}
      onShow={aLOuverture}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View style={styles.plein}>
        <Pressable
          style={styles.voile}
          onPress={() => onRepondre(false)}
          // Toucher à côté annule ; ce n'est pas une cible pour le clavier ni le lecteur d'écran.
          accessible={false}
          focusable={false}
          importantForAccessibility="no"
        />
        {demande ? (
          <View
            style={styles.boite}
            role="alertdialog"
            aria-modal
            aria-labelledby="dialogue-titre"
            aria-describedby="dialogue-message"
            accessibilityViewIsModal
          >
            <Texte variante="titreM" nativeID="dialogue-titre" accessibilityRole="header">
              {demande.titre}
            </Texte>
            <Texte
              variante="corpsM"
              couleur={couleurs.texte.encreDouce}
              nativeID="dialogue-message"
            >
              {demande.message}
            </Texte>
            <View style={styles.boutons}>
              <View style={styles.bouton}>
                <Bouton
                  libelle={demande.annuler ?? 'Annuler'}
                  variante="secondaire"
                  pleineLargeur
                  ref={annuler}
                  onPress={() => onRepondre(false)}
                />
              </View>
              <View style={styles.bouton}>
                <Bouton libelle={demande.action} pleineLargeur onPress={() => onRepondre(true)} />
              </View>
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  plein: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  voile: {
    ...StyleSheet.absoluteFill,
    zIndex: 0,
    backgroundColor: 'rgba(42, 35, 70, 0.45)',
  },
  boite: {
    zIndex: 1,
    width: '100%',
    maxWidth: 360,
    gap: 12,
    padding: 24,
    borderRadius: rayons.carte,
    backgroundColor: couleurs.fond.carte,
  },
  boutons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  bouton: {
    flex: 1,
  },
})
