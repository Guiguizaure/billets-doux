import type { Config } from '@billets-doux/shared/payload-types'

// Types générés (packages/shared) branchés sur l'API locale de Payload.
declare module 'payload' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- augmentation voulue
  export interface GeneratedTypes extends Config {}
}
