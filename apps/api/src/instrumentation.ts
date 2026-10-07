/**
 * Au démarrage du serveur (pas au premier appel) :
 * - en production, refuse de démarrer s'il manque une variable ;
 * - démarre Payload, et avec lui les tâches planifiées. Sans cela, après le redémarrage
 *   quotidien du dyno Heroku, les mots ne seraient annoncés qu'à la première requête.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  if (process.env.NEXT_PHASE === 'phase-production-build') return

  const { exigerVariablesDeProduction } = await import('@/lib/env')
  try {
    exigerVariablesDeProduction()
  } catch (erreur) {
    // Next ne fait que journaliser une erreur de ce crochet : on arrête vraiment le serveur
    // (Heroku l'affiche alors en « crashed », avec ce message dans le journal).
    console.error(erreur instanceof Error ? erreur.message : erreur)
    process.exit(1)
  }

  const [{ getPayload }, { default: config }] = await Promise.all([
    import('payload'),
    import('@payload-config'),
  ])
  await getPayload({ config })
}
