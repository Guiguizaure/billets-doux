import { createContext, type ReactNode, useCallback, useContext, useRef, useState } from 'react'
import { AccessibilityInfo, StyleSheet, View } from 'react-native'

import { couleurs } from '@/theme/tokens'

import { Bouton } from './Bouton'
import { Feuille } from './Feuille'
import { Texte } from './Texte'

export type DemandeChoix<T extends string> = {
  titre: string
  message?: string
  options: { valeur: T; libelle: string }[]
}

type Choisir = <T extends string>(demande: DemandeChoix<T>) => Promise<T | null>

const Contexte = createContext<Choisir | null>(null)

/** Un choix parmi quelques options, dans une feuille du bas : `await choisir({ titre, options })`. */
export function useChoisir() {
  const choisir = useContext(Contexte)
  if (!choisir) throw new Error('useChoisir : ChoixProvider manquant')
  return choisir
}

type EnCours = DemandeChoix<string> & { resoudre: (valeur: string | null) => void }

/**
 * Feuille de choix (même style que 2.2 et 2.7) : une option par bouton Secondaire,
 * « Annuler » en Discret. Le voile, le retour Android et Échap annulent (null).
 */
export function ChoixProvider({ children }: { children: ReactNode }) {
  const [ouvert, setOuvert] = useState(false)
  const [derniere, setDerniere] = useState<DemandeChoix<string> | null>(null)
  const courant = useRef<EnCours | null>(null)

  const choisir = useCallback(
    <T extends string>(demande: DemandeChoix<T>) =>
      new Promise<T | null>((resoudre) => {
        courant.current?.resoudre(null)
        courant.current = { ...demande, resoudre: resoudre as (valeur: string | null) => void }
        setDerniere(demande)
        setOuvert(true)
        AccessibilityInfo.announceForAccessibility(demande.titre)
      }),
    [],
  ) as Choisir

  const repondre = useCallback((valeur: string | null) => {
    courant.current?.resoudre(valeur)
    courant.current = null
    setOuvert(false)
  }, [])

  return (
    <Contexte.Provider value={choisir}>
      {children}
      <Feuille visible={ouvert} onFermer={() => repondre(null)}>
        {derniere ? (
          <>
            <View style={styles.tete}>
              <Texte variante="titreM" accessibilityRole="header">
                {derniere.titre}
              </Texte>
              {derniere.message ? (
                <Texte variante="corpsS" couleur={couleurs.texte.encreDouce}>
                  {derniere.message}
                </Texte>
              ) : null}
            </View>
            {derniere.options.map((o) => (
              <Bouton
                key={o.valeur}
                libelle={o.libelle}
                variante="secondaire"
                pleineLargeur
                onPress={() => repondre(o.valeur)}
              />
            ))}
            <Bouton
              libelle="Annuler"
              variante="discret"
              pleineLargeur
              onPress={() => repondre(null)}
            />
          </>
        ) : null}
      </Feuille>
    </Contexte.Provider>
  )
}

const styles = StyleSheet.create({
  tete: {
    gap: 8,
  },
})
