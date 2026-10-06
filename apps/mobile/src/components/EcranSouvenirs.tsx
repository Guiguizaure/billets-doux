import {
  type CarteSouvenir,
  formaterDuree,
  jourLocal,
  libellesJour,
  type Souvenirs,
  type TypeMot,
} from '@billets-doux/shared'
import { router, useFocusEffect } from 'expo-router'
import { useCallback, useMemo, useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import Lecture from '@/assets/icons/Lecture.svg'
import Livre from '@/assets/icons/Livre.svg'
import BoiteSouvenirs from '@/assets/illustrations/boite-souvenirs.svg'
import { api } from '@/lib/client'
import { exporterSouvenirs } from '@/lib/export'
import { messageErreur } from '@/lib/formulaires'
import { TYPES_DE_MOT } from '@/lib/typesDeMot'
import { useSession } from '@/session/SessionProvider'
import { couleurs, rayons } from '@/theme/tokens'

import { Alerte } from './Alerte'
import { Bouton } from './Bouton'
import { CasesFantomes } from './CasesFantomes'
import { Ecran } from './Ecran'
import { Onde } from './Onde'
import { PhotoMedia } from './PhotoMedia'
import { Puce } from './Puce'
import { Texte } from './Texte'

type Filtre = 'tout' | 'poeme' | 'vocal' | 'photo'

const FILTRES: { valeur: Filtre; libelle: string }[] = [
  { valeur: 'tout', libelle: 'Tout' },
  { valeur: 'poeme', libelle: 'Poèmes' },
  { valeur: 'vocal', libelle: 'Vocaux' },
  { valeur: 'photo', libelle: 'Photos' },
]

const garde = (filtre: Filtre, type: TypeMot) => filtre === 'tout' || filtre === type

/** Onde décorative d'une carte vocale (on n'a pas les niveaux du vocal). */
const ONDE = Array.from({ length: 26 }, (_, i) => 0.25 + ((i * 37) % 10) / 13)

/**
 * Écran 4.2 Souvenirs : tous les mots ouverts, dans les deux sens, filtrables par type,
 * « Ce jour-là » de temps en temps, et les mots jamais envoyés d'un duo fermé.
 * `enTete` et `avecExport` : version accessible sans duo (après une fermeture).
 */
export function EcranSouvenirs({
  enTete,
  avecExport = false,
}: {
  enTete?: React.ReactNode
  avecExport?: boolean
}) {
  const { moi } = useSession()
  const fuseau = moi?.utilisateur.fuseauHoraire ?? 'Europe/Paris'
  const [souvenirs, setSouvenirs] = useState<Souvenirs | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [filtre, setFiltre] = useState<Filtre>('tout')
  const [etatExport, setExport] = useState<'pret' | 'enCours'>('pret')

  useFocusEffect(
    useCallback(() => {
      let annule = false
      api
        .souvenirs()
        .then((s) => {
          if (!annule) setSouvenirs(s)
        })
        .catch((e: unknown) => {
          if (!annule) setErreur(messageErreur(e))
        })
      return () => {
        annule = true
      }
    }, []),
  )

  const mots = useMemo(
    () => souvenirs?.mots.filter((m) => garde(filtre, m.type)) ?? [],
    [souvenirs, filtre],
  )
  const jamais = useMemo(
    () => souvenirs?.jamaisEnvoyes.filter((m) => garde(filtre, m.type)) ?? [],
    [souvenirs, filtre],
  )

  const exporter = async () => {
    setExport('enCours')
    setErreur(null)
    try {
      await exporterSouvenirs()
    } catch (e) {
      setErreur(messageErreur(e))
    } finally {
      setExport('pret')
    }
  }

  const total = souvenirs?.mots.length ?? 0
  const depuis = souvenirs?.depuis
    ? libellesJour(jourLocal(new Date(souvenirs.depuis), fuseau)).date
    : null

  return (
    <Ecran
      enTete={enTete}
      bas={Boolean(enTete)}
      actions={
        avecExport && total + (souvenirs?.jamaisEnvoyes.length ?? 0) > 0 ? (
          <Bouton
            libelle="Exporter mes souvenirs"
            Icone={Livre}
            variante="secondaire"
            pleineLargeur
            enCours={etatExport === 'enCours'}
            onPress={() => void exporter()}
          />
        ) : null
      }
    >
      <View style={styles.titre}>
        <View style={styles.flex}>
          <Texte variante="labelS" couleur={couleurs.texte.encreDouce}>
            SOUVENIRS
          </Texte>
          <Texte variante="titreL" accessibilityRole="header">
            Tout ce qu’on s’est <Texte variante="titreItaliqueL">écrit</Texte>
          </Texte>
          <Texte variante="corpsS" couleur={couleurs.texte.encreDouce}>
            {total === 0
              ? 'Les mots ouverts viendront se ranger ici.'
              : `${total} mot${total > 1 ? 's' : ''}${depuis ? ` depuis le ${depuis}` : ''}`}
          </Texte>
        </View>
        {/* Illu/boite-souvenirs (220 × 180) à 55 %, comme dans la maquette. */}
        <BoiteSouvenirs width={121} height={99} />
      </View>

      <View style={styles.filtres} accessibilityRole="radiogroup" accessibilityLabel="Type de mot">
        {FILTRES.map((f) => (
          <Puce
            key={f.valeur}
            libelle={f.libelle}
            active={filtre === f.valeur}
            onPress={() => setFiltre(f.valeur)}
          />
        ))}
      </View>

      {erreur ? <Alerte message={erreur} /> : null}

      {souvenirs?.ceJourLa && filtre === 'tout' ? (
        <Pressable
          onPress={() =>
            router.push({ pathname: '/mot/[id]', params: { id: souvenirs.ceJourLa!.motId } })
          }
          accessibilityRole="button"
          accessibilityLabel={`Ce jour-là. ${souvenirs.ceJourLa.phrase}`}
          style={({ pressed }) => [styles.ceJourLa, pressed && styles.presse]}
        >
          {/* Validé : pas de texte sur un décor, le rose reste dans la pastille. */}
          <View style={styles.pastilleRose}>
            <Lecture width={18} height={18} color={couleurs.texte.encre} />
          </View>
          <View style={styles.flex}>
            <Texte variante="labelS" couleur={couleurs.texte.encreDouce}>
              CE JOUR-LÀ
            </Texte>
            <Texte variante="corpsS">{souvenirs.ceJourLa.phrase}</Texte>
          </View>
        </Pressable>
      ) : null}

      {!souvenirs ? (
        erreur ? null : (
          <CasesFantomes nombre={4} />
        )
      ) : (
        <>
          <Mosaique mots={mots} fuseau={fuseau} />
          {mots.length === 0 && total > 0 ? (
            <Texte variante="corpsS" couleur={couleurs.texte.encreDouce}>
              Rien de ce type pour l’instant.
            </Texte>
          ) : null}
          {jamais.length > 0 ? (
            <View style={styles.section}>
              <Texte variante="titreM" accessibilityRole="header">
                Jamais envoyés
              </Texte>
              <Texte variante="corpsS" couleur={couleurs.texte.encreDouce}>
                Restés dans ton tiroir quand le duo s’est fermé. Personne d’autre ne les voit.
              </Texte>
              <Mosaique mots={jamais} fuseau={fuseau} jamaisEnvoyes />
            </View>
          ) : null}
        </>
      )}
    </Ecran>
  )
}

/** Deux colonnes qui se remplissent l'une après l'autre (cartes de hauteurs différentes). */
function Mosaique({
  mots,
  fuseau,
  jamaisEnvoyes = false,
}: {
  mots: CarteSouvenir[]
  fuseau: string
  jamaisEnvoyes?: boolean
}) {
  const colonnes = [mots.filter((_, i) => i % 2 === 0), mots.filter((_, i) => i % 2 === 1)]
  return (
    <View style={styles.mosaique}>
      {colonnes.map((colonne, i) => (
        <View key={i} style={styles.colonne}>
          {colonne.map((m) => (
            <Carte key={m.id} mot={m} fuseau={fuseau} jamaisEnvoye={jamaisEnvoyes} />
          ))}
        </View>
      ))}
    </View>
  )
}

function Carte({
  mot,
  fuseau,
  jamaisEnvoye,
}: {
  mot: CarteSouvenir
  fuseau: string
  jamaisEnvoye: boolean
}) {
  const l = libellesJour(jourLocal(new Date(mot.le), fuseau))
  const quand = `${l.jourDuMois} ${l.nomMoisCourt}`.toUpperCase()
  const meta = jamaisEnvoye
    ? `JAMAIS ENVOYÉ · ${quand}`
    : `DE ${mot.deMoi ? 'TOI' : mot.de.toUpperCase()} · ${quand}`
  const type = TYPES_DE_MOT[mot.type].libelle.toLowerCase()
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/mot/[id]', params: { id: mot.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${type}, ${meta.toLowerCase()}${mot.extrait ? `. ${mot.extrait}` : ''}`}
      style={({ pressed }) => [styles.carte, pressed && styles.presse]}
    >
      {mot.photo ? <PhotoMedia mediaId={mot.photo} description="Photo du mot" /> : null}
      {mot.vocal ? (
        <View style={styles.vocal}>
          <Onde niveaux={ONDE} lecture={1} />
          <Texte variante="corpsS">Vocal · {formaterDuree(mot.vocal.duree)}</Texte>
        </View>
      ) : null}
      {mot.extrait && !mot.photo ? (
        <Texte variante={mot.manuscrit ? 'manuscritM' : 'corpsM'} numberOfLines={5}>
          {mot.titreOuvreQuand ? `${mot.titreOuvreQuand}\n` : ''}« {mot.extrait} »
        </Texte>
      ) : null}
      <Texte variante="labelS" couleur={couleurs.texte.encreDouce}>
        {meta}
      </Texte>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  titre: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  flex: {
    flex: 1,
    gap: 4,
  },
  filtres: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ceJourLa: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: rayons.carte,
    backgroundColor: couleurs.fond.papierOmbre,
  },
  pastilleRose: {
    width: 44,
    height: 44,
    borderRadius: rayons.pilule,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: couleurs.decor.rose,
  },
  presse: {
    opacity: 0.8,
  },
  mosaique: {
    flexDirection: 'row',
    gap: 10,
  },
  colonne: {
    flex: 1,
    gap: 10,
  },
  carte: {
    gap: 8,
    padding: 15,
    borderRadius: rayons.case,
    borderWidth: 1,
    borderColor: couleurs.trait.ligne,
    backgroundColor: couleurs.fond.carte,
  },
  vocal: {
    gap: 8,
    overflow: 'hidden',
  },
  section: {
    gap: 10,
    marginTop: 8,
  },
})
