import {
  type ClientApi,
  type Connexion,
  ErreurApi,
  type Inscription,
  type Moi,
  type Session as JetonSession,
} from '@billets-doux/shared'
import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import { api, jeton } from '@/lib/client'
import { retirerCetAppareil } from '@/lib/notifications'
import { stockageJeton } from '@/lib/stockage'

type Etat =
  | { statut: 'chargement' }
  | { statut: 'visiteur' }
  /** Un jeton existe mais l'API ne répond pas : on ne déconnecte pas pour autant. */
  | { statut: 'horsLigne' }
  | { statut: 'connecte'; moi: Moi }

/** Où en est la personne : c'est ce qui décide des écrans accessibles. */
export type Phase = 'chargement' | 'visiteur' | 'horsLigne' | 'sansDuo' | 'duo'

type Session = {
  phase: Phase
  moi: Moi | null
  api: ClientApi
  /** Code d'invitation saisi avant d'avoir un compte, repris après l'inscription. */
  codeEnAttente: string | null
  retenirCode: (code: string | null) => void
  inscrire: (donnees: Inscription) => Promise<void>
  connecter: (donnees: Connexion) => Promise<void>
  /** Version web : entre dans le duo de démo (compte de Léo), sans mot de passe. */
  connecterDemo: () => Promise<void>
  deconnecter: () => Promise<void>
  /** Remplace la vue « moi » par celle renvoyée par une route de l'API. */
  appliquer: (moi: Moi) => void
  /** Relit la vue « moi » (ex. : la personne invitée vient de rejoindre). */
  actualiser: () => Promise<void>
  reessayer: () => void
}

const Contexte = createContext<Session | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [etat, setEtat] = useState<Etat>({ statut: 'chargement' })
  const [tentative, setTentative] = useState(0)
  const [codeEnAttente, retenirCode] = useState<string | null>(null)

  useEffect(() => {
    let annule = false
    void demarrer().then((suivant) => {
      if (!annule) setEtat(suivant)
    })
    return () => {
      annule = true
    }
  }, [tentative])

  const ouvrir = useCallback(async (session: JetonSession) => {
    jeton.definir(session.jeton)
    await stockageJeton.ecrire(session.jeton)
    setEtat({ statut: 'connecte', moi: await api.moi() })
  }, [])

  const oublier = useCallback(async () => {
    jeton.definir(null)
    await stockageJeton.effacer()
    setEtat({ statut: 'visiteur' })
  }, [])

  const actualiser = useCallback(async () => {
    try {
      const moi = await api.moi()
      setEtat({ statut: 'connecte', moi })
    } catch (e) {
      // Session expirée ou révoquée : retour à l'accueil. Les autres erreurs (réseau) attendent.
      if (e instanceof ErreurApi && e.statut === 401) await oublier()
    }
  }, [oublier])

  // Fonctions stables : les écrans peuvent les mettre dans les dépendances de leurs effets.
  const appliquer = useCallback((suivant: Moi) => setEtat({ statut: 'connecte', moi: suivant }), [])
  const reessayer = useCallback(() => {
    setEtat({ statut: 'chargement' })
    setTentative((t) => t + 1)
  }, [])
  const inscrire = useCallback(
    async (donnees: Inscription) => ouvrir(await api.inscription(donnees)),
    [ouvrir],
  )
  const connecter = useCallback(
    async (donnees: Connexion) => ouvrir(await api.connexion(donnees)),
    [ouvrir],
  )
  const connecterDemo = useCallback(async () => ouvrir(await api.connexionDemo()), [ouvrir])
  const deconnecter = useCallback(async () => {
    // Avant de fermer la session : cet appareil ne reçoit plus les notifications du compte.
    await retirerCetAppareil()
    await api.deconnexion().catch(() => undefined)
    await oublier()
  }, [oublier])

  const valeur = useMemo<Session>(() => {
    const moi = etat.statut === 'connecte' ? etat.moi : null
    return {
      phase: phaseDe(etat),
      moi,
      api,
      codeEnAttente,
      retenirCode,
      inscrire,
      connecter,
      connecterDemo,
      deconnecter,
      appliquer,
      actualiser,
      reessayer,
    }
  }, [
    etat,
    codeEnAttente,
    inscrire,
    connecter,
    connecterDemo,
    deconnecter,
    appliquer,
    actualiser,
    reessayer,
  ])

  return <Contexte value={valeur}>{children}</Contexte>
}

export function useSession() {
  const session = use(Contexte)
  if (!session) throw new Error('useSession doit être utilisé sous <SessionProvider>')
  return session
}

function phaseDe(etat: Etat): Phase {
  if (etat.statut !== 'connecte') return etat.statut
  const duo = etat.moi.duo
  return duo && (duo.statut === 'actif' || duo.statut === 'pause') ? 'duo' : 'sansDuo'
}

/** Au lancement : reprend le jeton enregistré, le prolonge et charge le compte. */
async function demarrer(): Promise<Etat> {
  const enregistre = await stockageJeton.lire()
  if (!enregistre) return { statut: 'visiteur' }
  jeton.definir(enregistre)
  try {
    const session = await api.rafraichir()
    jeton.definir(session.jeton)
    await stockageJeton.ecrire(session.jeton)
    return { statut: 'connecte', moi: await api.moi() }
  } catch (e) {
    if (e instanceof ErreurApi && e.statut === 401) {
      jeton.definir(null)
      await stockageJeton.effacer()
      return { statut: 'visiteur' }
    }
    return { statut: 'horsLigne' }
  }
}
