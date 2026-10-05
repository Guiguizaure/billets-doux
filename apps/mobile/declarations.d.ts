declare module '*.svg' {
  import type { FC } from 'react'
  import type { SvgProps } from 'react-native-svg'
  const content: FC<SvgProps>
  export default content
}

// Feuille Tailwind de NativeWind, importée pour ses effets de bord.
declare module '*.css'
