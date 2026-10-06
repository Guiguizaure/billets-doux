import { formaterHeure, jourLocal, libellesJour, type VueNousDeux } from '@billets-doux/shared'
import { router, useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'

import Apercu from '@/assets/icons/Apercu.svg'
import Boite from '@/assets/icons/Boite.svg'
import Calendrier from '@/assets/icons/Calendrier.svg'
import Cloche from '@/assets/icons/Cloche.svg'
import Fermer from '@/assets/icons/Fermer.svg'
import Horloge from '@/assets/icons/Horloge.svg'
import Joker from '@/assets/icons/Joker.svg'
import Livre from '@/assets/icons/Livre.svg'
import Pause from '@/assets/icons/Pause.svg'
import LuneDormeuse from '@/assets/illustrations/lune-dormeuse.svg'
import Pointilles from '@/assets/decor/pointilles.svg'
import TimbreLune from '@/assets/illustrations/timbre-lune.svg'
import { Alerte } from '@/components/Alerte'
import { Bouton } from '@/components/Bouton'
import { useConfirmer } from '@/components/Dialogue'
import { Ecran } from '@/components/Ecran'
import { Feuille } from '@/components/Feuille'
import { FeuilleRetrouvailles } from '@/components/FeuilleRetrouvailles'
import { Interrupteur } from '@/components/Interrupteur'
import { CarteReglages, LigneReglage } from '@/components/LigneReglage'
import { LienTexte } from '@/components/LienTexte'
import { Texte } from '@/components/Texte'
import { api } from '@/lib/client'
import { exporterSouvenirs } from '@/lib/export'
import { messageErreur } from '@/lib/formulaires'
import { useSession } from '@/session/SessionProvider'
import { couleurs } from '@/theme/tokens'

/** Le 1er du mois suivant, chez la personne : « le 1er novembre ». */
function renouvellement(fuseau: string) {
  const { annee, mois } = libellesJour(jourLocal(new Date(), fuseau))
  const suivant =
    mois === 12 ? `${annee + 1}-01-01` : `${annee}-${String(mois + 1).padStart(2, '0')}-01`
  return `le 1er ${libellesJour(suivant).nomMois}`
}

/** Écran 5.1 Nous deux : réglages du duo, pause et fermeture (5.2). */
export default function NousDeux() {
  const { moi, appliquer, actualiser, deconnecter } = useSession()
  const fuseau = moi?.utilisateur.fuseauHoraire ?? 'Europe/Paris'
  const confirmer = useConfirmer()
  const [vue, setVue] = useState<VueNousDeux | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [feuille, setFeuille] = useState<'joker' | 'retrouvailles' | 'fermer' | null>(null)
  const [exportEnCours, setExportEnCours] = useState(false)

  const charger = useCallback(async () => {
    try {
      setVue(await api.nousDeux())
      setErreur(null)
    } catch (e) {
      setErreur(messageErreur(e))
    }
  }, [])

  // À chaque retour : l'autre a pu mettre en pause ou fermer le duo.
  useFocusEffect(
    useCallback(() => {
      void actualiser()
      void charger()
    }, [actualiser, charger]),
  )

  const reglage = async (cle: 'rappelDoux' | 'indicesVisibles', valeur: boolean) => {
    if (!vue) return
    setVue({ ...vue, reglages: { ...vue.reglages, [cle]: valeur } })
    try {
      appliquer(await api.mettreAJour({ reglages: { [cle]: valeur } }))
    } catch (e) {
      setErreur(messageErreur(e))
      void charger()
    }
  }

  const pause = async () => {
    if (!vue) return
    if (vue.pause?.parMoi) {
      appliquer(await api.reprendre())
    } else {
      const ok = await confirmer({
        titre: 'Mettre le duo en pause ?',
        message: `Plus aucune notification, pour toi comme pour ${vue.partenaire.prenom}. Les mots continuent de s’ouvrir. C’est toi qui pourras la lever.`,
        action: 'Mettre en pause',
      })
      if (!ok) return
      appliquer(await api.mettreEnPause())
    }
    await charger()
  }

  const exporter = async () => {
    setExportEnCours(true)
    try {
      await exporterSouvenirs()
    } catch (e) {
      setErreur(messageErreur(e))
    } finally {
      setExportEnCours(false)
    }
  }

  const fermer = async () => {
    try {
      // La session passe « sans duo » : l'appli rejoint l'écran « Le duo est fermé ».
      appliquer(await api.fermerDuo())
      setFeuille(null)
    } catch (e) {
      setErreur(messageErreur(e))
    }
  }

  if (!vue) {
    return (
      <Ecran bas={false}>
        {erreur ? <Alerte message={erreur} /> : <ActivityIndicator color={couleurs.texte.encre} />}
      </Ecran>
    )
  }

  const depuis = vue.depuis ? libellesJour(jourLocal(new Date(vue.depuis), fuseau)).date : null
  // Duo de démo : rien d'irréversible (l'API le refuse aussi).
  const demo = Boolean(moi?.utilisateur.demo)
  const partenaire = vue.partenaire.prenom

  return (
    <Ecran bas={false}>
      <View style={styles.duo}>
        <View style={styles.timbres} accessible={false}>
          <TimbreLune width={54} height={66} />
          <Pointilles width={48} height={2.5} color={couleurs.texte.encre} />
          <TimbreLune width={54} height={66} />
        </View>
        <Texte variante="titreL" accessibilityRole="header">
          {vue.moi.prenom} &amp; {partenaire}
        </Texte>
        <Texte variante="corpsS" couleur={couleurs.texte.encreDouce} style={styles.centre}>
          {[
            depuis ? `ensemble ici depuis le ${depuis}` : null,
            `${vue.motsEchanges} mot${vue.motsEchanges > 1 ? 's' : ''}`,
          ]
            .filter(Boolean)
            .join(' · ')}
        </Texte>
      </View>

      {erreur ? <Alerte message={erreur} /> : null}

      <CarteReglages>
        <LigneReglage
          Icone={Horloge}
          titre="Heure de découverte"
          detail={`${formaterHeure(vue.heureDecouverte)}, chaque jour`}
          onPress={() => router.push({ pathname: '/heure', params: { modifier: '1' } })}
        />
        <LigneReglage
          Icone={Cloche}
          titre="Rappel doux"
          detail="quand mon calendrier se vide"
          droite={
            <Interrupteur
              actif={vue.reglages.rappelDoux}
              onChange={(v) => void reglage('rappelDoux', v)}
              libelle="Rappel doux"
            />
          }
        />
        <LigneReglage
          Icone={Joker}
          titre="Joker du mois"
          detail={`${vue.jokersRestants} disponible${vue.jokersRestants > 1 ? 's' : ''}, renouvelé le 1er`}
          onPress={() => setFeuille('joker')}
        />
        <LigneReglage
          Icone={Apercu}
          titre="Indices"
          detail="visibles avant l’ouverture"
          droite={
            <Interrupteur
              actif={vue.reglages.indicesVisibles}
              onChange={(v) => void reglage('indicesVisibles', v)}
              libelle="Indices visibles avant l’ouverture"
            />
          }
        />
        <LigneReglage
          Icone={Calendrier}
          titre="Retrouvailles"
          detail={
            vue.retrouvailles
              ? libellesJour(vue.retrouvailles).long
              : 'choisir le jour où l’on se revoit'
          }
          onPress={() =>
            vue.retrouvailles ? router.push('/retrouvailles') : setFeuille('retrouvailles')
          }
        />
        <LigneReglage
          Icone={Livre}
          titre="Exporter nos souvenirs"
          detail={exportEnCours ? 'préparation de l’archive…' : 'archive à télécharger'}
          onPress={exportEnCours ? undefined : () => void exporter()}
          derniere
        />
      </CarteReglages>

      <CarteReglages>
        {vue.pause && !vue.pause.parMoi ? (
          // Seule la personne qui a mis la pause peut la lever.
          <LigneReglage Icone={Pause} titre={`${vue.pause.prenom} a mis le duo en pause`} />
        ) : (
          <LigneReglage
            Icone={Pause}
            titre={vue.pause ? 'Reprendre le duo' : 'Mettre le duo en pause'}
            onPress={() => void pause().catch((e: unknown) => setErreur(messageErreur(e)))}
          />
        )}
        <LigneReglage
          Icone={Fermer}
          titre="Fermer le duo"
          detail={demo ? 'désactivé dans la démo' : null}
          danger={!demo}
          onPress={demo ? undefined : () => setFeuille('fermer')}
          derniere
        />
      </CarteReglages>

      <View style={styles.liens}>
        <LienTexte
          libelle={demo ? 'Quitter la démo' : 'Se déconnecter'}
          onPress={() => void deconnecter()}
        />
        {demo ? null : (
          <LienTexte
            libelle="Supprimer mon compte"
            onPress={() => router.push('/compte/supprimer')}
          />
        )}
        {__DEV__ ? (
          <LienTexte libelle="Page de test (développement)" onPress={() => router.push('/lab')} />
        ) : null}
      </View>

      <Feuille visible={feuille === 'joker'} onFermer={() => setFeuille(null)}>
        <Texte variante="titreM" accessibilityRole="header">
          Joker du mois
        </Texte>
        <Texte variante="corpsM">
          Un joker par mois pour ouvrir un mot avant son jour. {partenaire} voit que tu l’as ouvert
          en avance.
        </Texte>
        <Texte variante="labelM">
          {vue.jokersRestants > 0
            ? `Il te reste ${vue.jokersRestants} joker ce mois-ci.`
            : `Tu as utilisé ton joker. Le prochain arrive ${renouvellement(fuseau)}.`}
        </Texte>
        <Bouton libelle="Compris" pleineLargeur onPress={() => setFeuille(null)} />
      </Feuille>

      {feuille === 'retrouvailles' ? (
        <FeuilleRetrouvailles
          visible
          onFermer={() => {
            setFeuille(null)
            void charger()
          }}
        />
      ) : null}

      <Feuille visible={feuille === 'fermer'} onFermer={() => setFeuille(null)}>
        <View style={styles.centreBloc}>
          {/* Illu/lune-dormeuse (180 × 180) à 50 %. */}
          <LuneDormeuse width={90} height={90} />
          <Texte variante="titreM" accessibilityRole="header" style={styles.centre}>
            Fermer le duo avec {partenaire} ?
          </Texte>
        </View>
        <Consequence Icone={Fermer}>
          {vue.motsPrevus > 0
            ? `Les ${vue.motsPrevus} mot${vue.motsPrevus > 1 ? 's' : ''} prévu${vue.motsPrevus > 1 ? 's' : ''} pour ${partenaire} ne ${vue.motsPrevus > 1 ? 'seront' : 'sera'} pas envoyé${vue.motsPrevus > 1 ? 's' : ''} : tu les gardes dans tes souvenirs.`
            : `Tes brouillons restent à toi, dans tes souvenirs.`}
        </Consequence>
        <Consequence Icone={Boite}>
          Chacun garde les mots déjà ouverts dans ses souvenirs.
        </Consequence>
        <Consequence Icone={Cloche}>
          {vue.pause
            ? `${partenaire} le verra en ouvrant l’appli.`
            : `${partenaire} recevra simplement : « Le duo est fermé ».`}
        </Consequence>
        {vue.pause ? null : (
          <Bouton
            libelle="Mettre en pause plutôt"
            Icone={Pause}
            variante="secondaire"
            pleineLargeur
            onPress={() => {
              setFeuille(null)
              void pause().catch((e: unknown) => setErreur(messageErreur(e)))
            }}
          />
        )}
        <Bouton libelle="Fermer le duo" pleineLargeur onPress={() => void fermer()} />
        <Bouton
          libelle="Exporter mes souvenirs d’abord"
          Icone={Livre}
          variante="discret"
          pleineLargeur
          onPress={() => void exporter()}
        />
      </Feuille>
    </Ecran>
  )
}

function Consequence({ Icone, children }: { Icone: typeof Fermer; children: React.ReactNode }) {
  return (
    <View style={styles.consequence}>
      <Icone width={20} height={20} color={couleurs.texte.encreDouce} />
      <Texte variante="corpsM" style={styles.flex}>
        {children}
      </Texte>
    </View>
  )
}

const styles = StyleSheet.create({
  duo: {
    alignItems: 'center',
    gap: 8,
  },
  timbres: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  centre: {
    textAlign: 'center',
  },
  centreBloc: {
    alignItems: 'center',
    gap: 12,
  },
  liens: {
    gap: 8,
    paddingBottom: 8,
  },
  consequence: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  flex: {
    flex: 1,
  },
})
