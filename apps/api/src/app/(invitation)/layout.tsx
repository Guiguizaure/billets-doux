import { DM_Sans, Instrument_Serif } from 'next/font/google'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import './invitation.css'

const titre = Instrument_Serif({ subsets: ['latin'], weight: '400', variable: '--police-titre' })
const corps = DM_Sans({ subsets: ['latin'], variable: '--police-corps' })

export const metadata: Metadata = {
  title: 'Invitation · Billets doux',
  robots: { index: false, follow: false },
}

/** Pages publiques du lien d'invitation (hors admin Payload). */
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={`${titre.variable} ${corps.variable}`}>
      <body>{children}</body>
    </html>
  )
}
