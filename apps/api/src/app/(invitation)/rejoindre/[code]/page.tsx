import { formaterCode, normaliserCode } from '@billets-doux/shared'
import config from '@payload-config'
import { headers } from 'next/headers'
import { getPayload } from 'payload'

import { idDe } from '@/lib/ids'
import { invitationValable } from '@/lib/invitation'

type Props = { params: Promise<{ code: string }> }

/**
 * Page ouverte par le lien d'invitation. Elle propose d'ouvrir l'appli
 * (billetsdoux://rejoindre?code=…, ou billetsdoux-dev:// pour l'appli de développement, selon
 * `APP_SCHEME`) ou la version web, et rappelle le code.
 */
export default async function Invitation({ params }: Props) {
  const code = normaliserCode(decodeURIComponent((await params).code))
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'duos',
    where: { code: { equals: code } },
    limit: 1,
    depth: 0,
  })
  const duo = docs[0]
  if (!duo || !invitationValable(duo)) {
    return (
      <main>
        <h1>Cette invitation n’est plus valable</h1>
        <p>Demande à ta personne de t’envoyer un nouveau lien depuis Billets doux.</p>
      </main>
    )
  }

  const createurId = idDe(duo.createur)
  const createur = createurId
    ? await payload.findByID({ collection: 'users', id: createurId, depth: 0 })
    : null
  const web = await urlWeb()

  return (
    <main>
      <h1>{createur ? `${createur.prenom} t’invite` : 'Tu es invité·e'}</h1>
      <p>Billets doux se partage avec une seule personne. Rejoins votre duo pour commencer.</p>
      <div className="carte">
        <div className="label">TON CODE D’INVITATION</div>
        <div className="code">{formaterCode(code)}</div>
      </div>
      <a className="bouton principal" href={`${schemaAppli()}://rejoindre?code=${code}`}>
        Ouvrir dans l’appli
      </a>
      <a className="bouton secondaire" href={`${web}/rejoindre?code=${code}`}>
        Continuer sur le web
      </a>
    </main>
  )
}

/** Schéma de lien de l'appli servie par cette API : production par défaut. */
function schemaAppli() {
  return process.env.APP_SCHEME || 'billetsdoux'
}

/** Version web de l'appli : `WEB_URL` si défini, sinon le même hôte sur le port d'Expo (dev). */
async function urlWeb() {
  if (process.env.WEB_URL) return process.env.WEB_URL.replace(/\/$/, '')
  const hote = (await headers()).get('host') ?? 'localhost:3100'
  return `http://${hote.replace(/:\d+$/, '')}:8081`
}
