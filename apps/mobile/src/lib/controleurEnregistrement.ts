/**
 * Ce que le contrôleur attend d'un enregistreur : le sous-ensemble utilisé de
 * l'`AudioRecorder` d'expo-audio (et un faux enregistreur dans les tests).
 */
export interface Enregistreur {
  prepareToRecordAsync(): Promise<void>
  record(): void
  pause(): void
  stop(): Promise<void>
  getStatus(): { durationMillis: number; metering?: number }
  readonly uri: string | null
}

export type Mesure = { duree: number; niveau: number | null; limiteAtteinte: boolean }

/**
 * Logique de l'enregistrement, sans React, pour la tester hors du téléphone.
 *
 * Deux pièges d'expo-audio sur Android, observés à l'étape 3 :
 * - la durée renvoyée par `getStatus()` retombe à 0 dès l'arrêt : on garde donc la
 *   dernière durée mesurée, et plus aucune mesure n'est prise une fois l'arrêt lancé ;
 * - l'enregistreur est libéré au démontage de l'écran : `getStatus()` lève alors une
 *   erreur. `liberer()` ne l'appelle jamais et n'arrête que dans un try/catch.
 */
export class ControleurEnregistrement {
  /** Vrai entre `record()` et `stop()` (pause comprise). */
  private actif = false
  private dureeMs = 0

  constructor(
    private readonly enregistreur: Enregistreur,
    private readonly maxMs: number,
  ) {}

  get enCours() {
    return this.actif
  }

  async demarrer() {
    await this.enregistreur.prepareToRecordAsync()
    this.enregistreur.record()
    this.dureeMs = 0
    this.actif = true
  }

  /** Appelé régulièrement pendant l'enregistrement ; null dès que l'arrêt est lancé. */
  mesurer(): Mesure | null {
    if (!this.actif) return null
    const statut = this.statut()
    if (!statut) return null
    this.dureeMs = Math.max(this.dureeMs, statut.durationMillis)
    return {
      duree: this.dureeMs / 1000,
      niveau: statut.metering ?? null,
      limiteAtteinte: this.dureeMs >= this.maxMs,
    }
  }

  pause() {
    this.relever()
    this.enregistreur.pause()
  }

  reprendre() {
    this.enregistreur.record()
  }

  /** Arrête et renvoie le fichier avec sa durée ; null si rien n'était en cours (double appel). */
  async arreter() {
    if (!this.actif) return null
    this.relever()
    this.actif = false
    await this.enregistreur.stop()
    return { uri: this.enregistreur.uri, duree: this.dureeMs / 1000 }
  }

  /** Au démontage : coupe le micro si besoin, sans jamais interroger l'enregistreur. */
  liberer() {
    if (!this.actif) return
    this.actif = false
    try {
      void this.enregistreur.stop().catch(() => undefined)
    } catch {
      // Déjà libéré par expo-audio : le micro est coupé avec lui.
    }
  }

  /** Garde la plus grande durée connue (avant l'arrêt, elle est encore juste). */
  private relever() {
    const statut = this.statut()
    if (statut) this.dureeMs = Math.max(this.dureeMs, statut.durationMillis)
  }

  private statut() {
    try {
      return this.enregistreur.getStatus()
    } catch {
      return null
    }
  }
}
