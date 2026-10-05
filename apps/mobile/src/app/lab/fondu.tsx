import { Redirect } from 'expo-router'

import { EcranTransition } from '@/lab/EcranTransition'

/** Animation définie dans app/_layout.tsx (fade). */
export default function Fondu() {
  if (!__DEV__) return <Redirect href="/" />
  return <EcranTransition nom="fondu" />
}
