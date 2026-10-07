import { formaterHeure, type OngletTutoriel } from '@billets-doux/shared'
import { router, usePathname } from 'expo-router'
import {
  createContext,
  type ReactNode,
  type RefObject,
  use,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import {
  BackHandler,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native'
import Animated, { FadeIn } from 'react-native-reanimated'

import { type CibleVisite, bulleOnglet, VISITE_DEMO } from '@/lib/tutoriel'
import { visiteDemo } from '@/lib/visiteDemo'
import { useSession } from '@/session/SessionProvider'
import { couleurs } from '@/theme/tokens'

import { Bulle, LARGEUR_BULLE } from './Bulle'

type Cadre = { x: number; y: number; l: number; h: number }
type Enregistrer = (nom: string) => (vue: View | null) => void

/** Chaque onglet, son chemin et le nom de son bouton dans la barre. */
const ONGLETS: Record<string, { onglet: OngletTutoriel; route: string }> = {
  '/pour-moi': { onglet: 'pourMoi', route: 'pour-moi' },
  '/pour-toi': { onglet: 'pourToi', route: 'pour-toi' },
  '/souvenirs': { onglet: 'souvenirs', route: 'souvenirs' },
  '/nous-deux': { onglet: 'nousDeux', route: 'nous-deux' },
}
const TOUS: OngletTutoriel[] = ['pourMoi', 'pourToi', 'souvenirs', 'nousDeux']

/** Les éléments visés par la visite de la démo. */
const CIBLES_VISITE: Record<NonNullable<CibleVisite>, string> = {
  titre: 'titre',
  caseScellee: 'caseScellee',
  ongletPourToi: 'onglet:pour-toi',
  ongletSouvenirs: 'onglet:souvenirs',
}

/** Délai avant une bulle : l'écran se pose (et le rituel passe devant s'il doit s'ouvrir). */
const DELAI = 600

const ContexteCibles = createContext<Enregistrer | null>(null)
const ContexteRevoir = createContext<(() => Promise<void>) | null>(null)

/** Rend un élément visable par le tutoriel (`ref` d'une vue native). */
export function useCible(nom: string) {
  return use(ContexteCibles)?.(nom)
}

/** Pour les listes (barre d'onglets) : une `ref` par nom. */
export function useEnregistrerCible() {
  return use(ContexteCibles)
}

/** « Revoir le tutoriel » (Nous deux). */
export function useRevoirTutoriel() {
  return use(ContexteRevoir)
}

type Affichage = {
  cle: string
  cible: string | null
  texte: string
  etape?: number
  total?: number
  libelleSuivant: string
  onSuivant: () => void
  onPasser: () => void
}

/**
 * Le tutoriel, posé au-dessus des onglets :
 * - démo (version web) : visite guidée de 5 bulles sur « Pour moi », retenue par le navigateur ;
 * - comptes réels : une bulle à la première visite de chaque onglet, retenue sur le compte,
 *   une fois les trois cartes du principe vues.
 */
export function TutorielProvider({ children }: { children: ReactNode }) {
  const { moi, api, appliquer } = useSession()
  const chemin = usePathname()
  const racine = useRef<View>(null)

  // Les éléments visés : chacun s'enregistre par sa `ref`.
  const [vues] = useState(() => new Map<string, View>())
  const [rappels] = useState(() => new Map<string, (vue: View | null) => void>())
  const [, setVersion] = useState(0)
  const enregistrer = useCallback<Enregistrer>(
    (nom) => {
      let rappel = rappels.get(nom)
      if (!rappel) {
        rappel = (vue) => {
          const avant = vues.has(nom)
          if (vue) vues.set(nom, vue)
          else vues.delete(nom)
          if (avant !== Boolean(vue)) setVersion((v) => v + 1)
        }
        rappels.set(nom, rappel)
      }
      return rappel
    },
    [vues, rappels],
  )

  const [pretSur, setPretSur] = useState<string | null>(null)
  useEffect(() => {
    const minuterie = setTimeout(() => setPretSur(chemin), DELAI)
    return () => clearTimeout(minuterie)
  }, [chemin])
  const pret = pretSur === chemin

  const demo = Boolean(moi?.utilisateur.demo)
  const [visiteFinie, setVisiteFinie] = useState(() => visiteDemo.faite())
  const [etape, setEtape] = useState(0)
  const [fermees, setFermees] = useState<OngletTutoriel[]>([])

  const terminerVisite = () => {
    visiteDemo.marquerFaite()
    setVisiteFinie(true)
  }
  const fermerBulle = (onglet: OngletTutoriel) => {
    setFermees((f) => [...f, onglet])
    api
      .mettreAJour({ tutoriel: { bulleVue: onglet } })
      .then(appliquer)
      .catch(() => undefined)
  }
  const passerBulles = () => {
    setFermees(TOUS)
    api
      .mettreAJour({ tutoriel: { passer: true } })
      .then(appliquer)
      .catch(() => undefined)
  }

  const revoir = useCallback(async () => {
    if (demo) {
      visiteDemo.oublier()
      setEtape(0)
      setVisiteFinie(false)
      router.navigate('/pour-moi')
      return
    }
    appliquer(await api.mettreAJour({ tutoriel: { revoir: true } }))
    setFermees([])
    router.navigate('/pour-moi')
    router.push({ pathname: '/principe', params: { revoir: '1' } })
  }, [demo, api, appliquer])

  let affichage: Affichage | null = null
  const ici = ONGLETS[chemin]
  const tutoriel = moi?.utilisateur.tutoriel
  if (demo) {
    if (!visiteFinie && pret && chemin === '/pour-moi' && vues.has('titre')) {
      const pas = VISITE_DEMO[Math.min(etape, VISITE_DEMO.length - 1)]!
      const derniere = etape >= VISITE_DEMO.length - 1
      affichage = {
        cle: `visite-${etape}`,
        cible: pas.cible ? CIBLES_VISITE[pas.cible] : null,
        texte: pas.texte,
        etape: etape + 1,
        total: VISITE_DEMO.length,
        libelleSuivant: derniere ? 'Terminer' : 'Suivant',
        onSuivant: derniere ? terminerVisite : () => setEtape(etape + 1),
        onPasser: terminerVisite,
      }
    }
  } else if (
    ici &&
    pret &&
    tutoriel?.cartesVues &&
    !tutoriel.bullesVues.includes(ici.onglet) &&
    !fermees.includes(ici.onglet)
  ) {
    affichage = {
      cle: `onglet-${ici.onglet}`,
      cible: `onglet:${ici.route}`,
      texte: bulleOnglet(
        ici.onglet,
        moi?.duo?.partenaire?.prenom ?? 'l’autre',
        formaterHeure(moi?.utilisateur.heureDecouverte ?? '08:00'),
      ),
      libelleSuivant: 'Compris',
      onSuivant: () => fermerBulle(ici.onglet),
      onPasser: passerBulles,
    }
  }

  return (
    <ContexteCibles value={enregistrer}>
      <ContexteRevoir value={revoir}>
        <View ref={racine} collapsable={false} style={styles.plein}>
          {/* Pendant une bulle, le lecteur d'écran ne lit qu'elle. */}
          <View
            style={styles.plein}
            aria-hidden={affichage !== null}
            importantForAccessibility={affichage ? 'no-hide-descendants' : 'auto'}
          >
            {children}
          </View>
          {affichage ? (
            <Calque
              key={affichage.cle}
              {...affichage}
              racine={racine}
              vue={affichage.cible ? (vues.get(affichage.cible) ?? null) : null}
              barre={vues.get('onglet:pour-moi') ?? null}
            />
          ) : null}
        </View>
      </ContexteRevoir>
    </ContexteCibles>
  )
}

/**
 * Voile léger, anneau rouge cachet autour de l'élément, bulle au-dessus ou en dessous avec sa
 * flèche. Sans élément (ou s'il est hors de l'écran), la bulle se pose au milieu.
 * Retour Android et Échap valent « Passer ».
 */
function Calque({
  racine,
  vue,
  barre,
  cible,
  texte,
  etape,
  total,
  libelleSuivant,
  onSuivant,
  onPasser,
}: Affichage & {
  racine: RefObject<View | null>
  vue: View | null
  barre: View | null
}) {
  const { width, height } = useWindowDimensions()
  const [mesure, setMesure] = useState<{ l: number; h: number; cadre: Cadre | null } | null>(null)

  useEffect(() => {
    let annule = false
    const image = requestAnimationFrame(() => {
      racine.current?.measureInWindow((rx, ry, l, h) => {
        if (!vue) {
          if (!annule) setMesure({ l, h, cadre: null })
          return
        }
        vue.measureInWindow((x, y, cl, ch) => {
          const cadre = { x: x - rx, y: y - ry, l: cl, h: ch }
          const finir = (plancher: number) => {
            if (annule) return
            const visible = cl > 0 && cadre.y >= 0 && cadre.y + cadre.h <= plancher
            setMesure({ l, h, cadre: visible ? cadre : null })
          }
          // Une case doit être visible au-dessus de la barre d'onglets.
          if (cible?.startsWith('onglet:') || !barre) finir(h)
          else barre.measureInWindow((_bx, by) => finir(by - ry))
        })
      })
    })
    return () => {
      annule = true
      cancelAnimationFrame(image)
    }
  }, [racine, vue, barre, cible, width, height])

  // Retour Android et Échap : « Passer ».
  const passer = useRef(onPasser)
  useEffect(() => {
    passer.current = onPasser
  })
  useEffect(() => {
    if (Platform.OS === 'web') {
      const touche = (e: KeyboardEvent) => {
        if (e.key === 'Escape') passer.current()
      }
      window.addEventListener('keydown', touche)
      return () => window.removeEventListener('keydown', touche)
    }
    const abonnement = BackHandler.addEventListener('hardwareBackPress', () => {
      passer.current()
      return true
    })
    return () => abonnement.remove()
  }, [])

  const bulle = (fleche: 'haut' | 'bas' | null, flecheX = 0) => (
    <Bulle
      texte={texte}
      etape={etape}
      total={total}
      fleche={fleche}
      flecheX={flecheX}
      libelleSuivant={libelleSuivant}
      onSuivant={onSuivant}
      onPasser={onPasser}
    />
  )

  let contenu: ReactNode = null
  if (mesure && mesure.cadre) {
    const { l, h, cadre } = mesure
    const largeur = Math.min(LARGEUR_BULLE, l - 32)
    const centre = cadre.x + cadre.l / 2
    const gauche = Math.min(Math.max(centre - largeur / 2, 16), l - largeur - 16)
    // La flèche reste entre les coins arrondis de la bulle.
    const marge = largeur / 2 - 28
    const flecheX = Math.max(-marge, Math.min(marge, centre - (gauche + largeur / 2)))
    const dessus = cadre.y + cadre.h / 2 > h / 2
    contenu = (
      <>
        <View
          pointerEvents="none"
          style={[
            styles.anneau,
            { left: cadre.x - 4, top: cadre.y - 4, width: cadre.l + 8, height: cadre.h + 8 },
          ]}
        />
        <View
          style={[
            styles.place,
            { left: gauche, width: largeur },
            dessus ? { bottom: h - cadre.y + 6 } : { top: cadre.y + cadre.h + 6 },
          ]}
        >
          {bulle(dessus ? 'bas' : 'haut', flecheX)}
        </View>
      </>
    )
  } else if (mesure) {
    contenu = <View style={styles.milieu}>{bulle(null)}</View>
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View entering={FadeIn.duration(220)} style={StyleSheet.absoluteFill}>
        {/* Le voile retient les touchers : on lit la bulle, puis on choisit. */}
        <Pressable accessible={false} style={styles.voile} />
      </Animated.View>
      {contenu}
    </View>
  )
}

const styles = StyleSheet.create({
  plein: {
    flex: 1,
  },
  voile: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(42, 35, 70, 0.28)',
  },
  anneau: {
    position: 'absolute',
    borderRadius: 20,
    borderWidth: 2.5,
    borderColor: couleurs.action.cachet,
  },
  place: {
    position: 'absolute',
  },
  milieu: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
})
