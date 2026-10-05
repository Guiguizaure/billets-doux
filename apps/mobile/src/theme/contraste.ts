/** Ratio de contraste WCAG 2 entre deux couleurs hexadécimales (#RRGGBB). */
export function ratioContraste(a: string, b: string) {
  const [clair, fonce] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (clair + 0.05) / (fonce + 0.05)
}

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
