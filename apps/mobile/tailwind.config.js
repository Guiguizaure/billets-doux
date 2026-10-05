// Tailwind (NativeWind) construit à partir des mêmes tokens que src/theme/tokens.ts.
const palette = require('./src/theme/palette.json')

const kebab = (s) => s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)
const enKebab = (obj) =>
  Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [kebab(k), typeof v === 'object' ? enKebab(v) : v]),
  )

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  // Appli en thème clair uniquement (userInterfaceStyle: light) ; 'media' plante sur le web.
  darkMode: 'class',
  theme: {
    extend: {
      // ex. bg-fond-papier-ombre, text-texte-encre-douce, bg-action-cachet
      colors: enKebab(palette),
      // Mêmes noms que src/theme/polices.ts (une famille par graisse).
      fontFamily: {
        titre: ['InstrumentSerif_400Regular'],
        'titre-italique': ['InstrumentSerif_400Regular_Italic'],
        corps: ['DMSans_400Regular'],
        'corps-medium': ['DMSans_500Medium'],
        'corps-semibold': ['DMSans_600SemiBold'],
        manuscrit: ['Caveat_400Regular'],
      },
      borderRadius: {
        case: '18px',
      },
    },
  },
  plugins: [],
}
