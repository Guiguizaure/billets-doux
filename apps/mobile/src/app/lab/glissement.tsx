import { Redirect } from 'expo-router'

import { EcranTransition } from '@/lab/EcranTransition'

/** Animation définie dans app/_layout.tsx (slide_from_right). */
export default function Glissement() {
  if (!__DEV__) return <Redirect href="/" />
  return <EcranTransition nom="glissement" />
}
