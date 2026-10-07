/**
 * Outils communs des scripts en ligne de commande (admin:creer, demo:creer, sauvegardes) :
 * base visée affichée et confirmée, saisie ligne à ligne qui marche dans un terminal (mot de
 * passe masqué) comme avec des lignes envoyées sur l'entrée standard (pour tester les scripts).
 * Modèle : Le jardin d'Ana.
 */
import readline from 'node:readline'

import type { MongooseAdapter } from '@payloadcms/db-mongodb'
import type { Payload } from 'payload'

/** Hôte et nom de la base seulement : les identifiants ne s'affichent jamais. */
export const decrireBase = (uri: string) => {
  const sansIdentifiants = uri.replace(/\/\/[^@/]*@/, '//').split('?')[0]!
  const morceaux = sansIdentifiants.match(/^[a-z+]+:\/\/([^/]+)\/?(.*)$/i)
  if (!morceaux) return '(adresse de base illisible)'
  return `hôte ${morceaux[1]} · base « ${morceaux[2] || '(par défaut)'} »`
}

/** Vérifie l'environnement (DATABASE_URI, PAYLOAD_SECRET) et affiche la base visée. */
export const annoncerBase = () => {
  const uri = process.env.DATABASE_URI
  if (!uri) throw new Error('DATABASE_URI est vide : renseigne-la dans .env ou dans le shell.')
  if (!process.env.PAYLOAD_SECRET) throw new Error('PAYLOAD_SECRET est vide.')
  console.log(`Base ciblée : ${decrireBase(uri)}`)
}

/**
 * Sur une base neuve (première mise en ligne), Payload crée collections et index au démarrage :
 * une écriture lancée tout de suite échoue (« Unable to acquire IX lock »). On attend la fin.
 */
export const attendreBasePrete = async (payload: Payload) => {
  const { collections } = payload.db as MongooseAdapter
  await Promise.all(Object.values(collections).map((modele) => modele.init()))
}

export const estOui = (reponse: string) => /^(o|oui|y|yes)$/i.test(reponse.trim())

export const creerSaisie = () => {
  const interactif = Boolean(process.stdin.isTTY)
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: interactif,
  }) as readline.Interface & { _writeToOutput?: (texte: string) => void }

  // Les lignes sont mises en file : une entrée envoyée d'un bloc n'est jamais perdue.
  const lignes: string[] = []
  const attentes: ((ligne: string | null) => void)[] = []
  let fermee = false
  rl.on('line', (ligne) => {
    const suivante = attentes.shift()
    if (suivante) suivante(ligne)
    else lignes.push(ligne)
  })
  rl.on('close', () => {
    fermee = true
    while (attentes.length) attentes.shift()!(null)
  })

  // Dans un terminal, rien ne s'affiche pendant la saisie d'un mot de passe.
  let muet = false
  const ecrire = rl._writeToOutput?.bind(rl)
  rl._writeToOutput = (texte) => {
    if (!muet && ecrire) ecrire(texte)
  }

  const demander = async (question: string, { masque = false } = {}): Promise<string> => {
    process.stdout.write(question)
    muet = masque && interactif
    const ligne =
      lignes.length > 0
        ? lignes.shift()!
        : fermee
          ? null
          : await new Promise<string | null>((fin) => attentes.push(fin))
    muet = false
    if (masque && interactif) process.stdout.write('\n')
    if (ligne === null) throw new Error('Saisie interrompue.')
    return ligne
  }

  /** Confirmation (oui/non), sauf avec --oui. */
  const confirmer = async (question: string) =>
    process.argv.includes('--oui') || estOui(await demander(`${question} (oui/non) `))

  return { demander, confirmer, fermer: () => rl.close() }
}

/** Lance un script et sort avec un code d'état (Payload garde la connexion à la base ouverte). */
export const lancer = (principal: () => Promise<void>, echec: string) =>
  principal()
    .then(() => process.exit(0))
    .catch((erreur: unknown) => {
      console.error(`${echec} : ${erreur instanceof Error ? erreur.message : String(erreur)}`)
      process.exit(1)
    })
