import { describe, expect, it } from 'vitest'

import { exigerVariablesDeProduction, VARIABLES_REQUISES } from '@/lib/env'

const complet = Object.fromEntries(VARIABLES_REQUISES.map((nom) => [nom, 'valeur']))

describe('variables de production', () => {
  it('refuse de démarrer en production s’il en manque, et les nomme', () => {
    expect(() =>
      exigerVariablesDeProduction({
        ...complet,
        NODE_ENV: 'production',
        S3_BUCKET: '',
        EXPO_ACCESS_TOKEN: '  ',
      }),
    ).toThrow(/manquantes en production : S3_BUCKET, EXPO_ACCESS_TOKEN\./)
  })

  it('ne dit rien quand tout est là, en développement, ni pendant le build', () => {
    expect(() => exigerVariablesDeProduction({ ...complet, NODE_ENV: 'production' })).not.toThrow()
    expect(() => exigerVariablesDeProduction({ NODE_ENV: 'development' })).not.toThrow()
    expect(() =>
      exigerVariablesDeProduction({
        NODE_ENV: 'production',
        NEXT_PHASE: 'phase-production-build',
      }),
    ).not.toThrow()
  })
})
