import { describe, expect, it } from 'vitest'
import { paleta } from '../../tailwind.config.js'

const canal = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)

function luminancia(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => canal(parseInt(hex.slice(i, i + 2), 16) / 255))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contraste(a: string, b: string): number {
  const [x, y] = [luminancia(a), luminancia(b)]
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

const BLANCO = '#FFFFFF'
const { neutral, primary, info, warn, ok, critical } = paleta

describe('paleta: contraste WCAG', () => {
  // Texto: mínimo AA (4.5:1).
  it.each([
    ['primary-600 sobre blanco', primary[600], BLANCO],
    ['primary-700 sobre blanco', primary[700], BLANCO],
    ['blanco sobre primary-600', BLANCO, primary[600]],
    ['info-700 sobre blanco', info[700], BLANCO],
    ['warn-700 sobre blanco', warn[700], BLANCO],
    ['warn-700 sobre warn-50', warn[700], warn[50]],
    ['ok-600 sobre blanco', ok[600], BLANCO],
    ['ok-700 sobre ok-50', ok[700], ok[50]],
    ['critical-600 sobre blanco', critical[600], BLANCO],
    ['critical-600 sobre critical-50', critical[600], critical[50]],
    ['neutral-500 sobre neutral-50', neutral[500], neutral[50]],
    ['neutral-900 sobre neutral-50', neutral[900], neutral[50]],
    ['neutral-900 sobre warn-500', neutral[900], warn[500]],
    ['neutral-100 sobre neutral-900', neutral[100], neutral[900]],
  ])('texto: %s ≥ 4.5', (_n, fg, bg) => {
    expect(contraste(fg, bg)).toBeGreaterThanOrEqual(4.5)
  })

  // Gráficos e íconos: mínimo 3:1.
  it.each([
    ['info-600 sobre blanco', info[600], BLANCO],
    ['warn-500 sobre neutral-900', warn[500], neutral[900]],
    ['info-600 sobre neutral-900', info[600], neutral[900]],
    ['neutral-400 sobre blanco', neutral[400], BLANCO],
  ])('gráfico: %s ≥ 3', (_n, fg, bg) => {
    expect(contraste(fg, bg)).toBeGreaterThanOrEqual(3)
  })

  // Restricciones de uso documentadas: estos colores NO sirven como texto sobre blanco.
  it('warn-500 e info-600 no alcanzan AA como texto sobre blanco', () => {
    expect(contraste(warn[500], BLANCO)).toBeLessThan(4.5)
    expect(contraste(info[600], BLANCO)).toBeLessThan(4.5)
  })
})
