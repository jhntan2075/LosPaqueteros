import { describe, expect, it } from 'vitest'
import { paleta, paletaOscura, semanticos } from '../../tailwind.config.js'

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
    // Combinaciones de los componentes base (src/components/ui).
    ['neutral-600 sobre blanco', neutral[600], BLANCO],
    ['neutral-600 sobre neutral-50', neutral[600], neutral[50]],
    ['neutral-700 sobre neutral-100', neutral[700], neutral[100]],
    ['blanco sobre primary-700', BLANCO, primary[700]],
    ['primary-700 sobre primary-50', primary[700], primary[50]],
    ['primary-700 sobre primary-100', primary[700], primary[100]],
    ['ok-700 sobre blanco', ok[700], BLANCO],
    ['blanco sobre critical-600', BLANCO, critical[600]],
    ['blanco sobre critical-700', BLANCO, critical[700]],
    ['info-700 sobre info-50', info[700], info[50]],
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

describe('paleta oscura: contraste WCAG', () => {
  const o = paletaOscura
  const f = semanticos.oscuro
  // Mismos roles que en el tema claro; `superficie` ocupa el lugar del blanco.
  it.each([
    ['neutral-900 sobre superficie', o.neutral[900], f.superficie],
    ['neutral-900 sobre fondo', o.neutral[900], f.fondo],
    ['neutral-900 sobre neutral-50', o.neutral[900], o.neutral[50]],
    ['neutral-600 sobre superficie', o.neutral[600], f.superficie],
    ['neutral-600 sobre neutral-50', o.neutral[600], o.neutral[50]],
    ['neutral-500 sobre neutral-50', o.neutral[500], o.neutral[50]],
    ['neutral-700 sobre neutral-100', o.neutral[700], o.neutral[100]],
    ['primary-600 sobre superficie', o.primary[600], f.superficie],
    ['primary-700 sobre superficie', o.primary[700], f.superficie],
    ['primary-700 sobre primary-50', o.primary[700], o.primary[50]],
    ['primary-700 sobre primary-100', o.primary[700], o.primary[100]],
    ['sobre-color sobre primary-600', f['sobre-color'], o.primary[600]],
    ['sobre-color sobre primary-700', f['sobre-color'], o.primary[700]],
    ['sobre-color sobre critical-600', f['sobre-color'], o.critical[600]],
    ['sobre-color sobre critical-700', f['sobre-color'], o.critical[700]],
    ['info-700 sobre info-50', o.info[700], o.info[50]],
    ['warn-700 sobre superficie', o.warn[700], f.superficie],
    ['warn-700 sobre warn-50', o.warn[700], o.warn[50]],
    ['ok-600 sobre superficie', o.ok[600], f.superficie],
    ['ok-700 sobre ok-50', o.ok[700], o.ok[50]],
    ['critical-600 sobre superficie', o.critical[600], f.superficie],
    ['critical-600 sobre critical-50', o.critical[600], o.critical[50]],
    ['sobre-inverso sobre inverso', f['sobre-inverso'], f.inverso],
    ['primary-100 sobre inverso (acción del aviso)', o.primary[100], f.inverso],
    // Valores fijados por la rúbrica, reemplazados en src/index.css para el tema oscuro.
    ['semáforo verde (#4ADE80) sobre superficie', '#4ADE80', f.superficie],
    ['semáforo ámbar (#FBA04B) sobre superficie', '#FBA04B', f.superficie],
    ['semáforo rojo (#F87171) sobre superficie', '#F87171', f.superficie],
    ['semáforo vacío (#94A3B8) sobre superficie', '#94A3B8', f.superficie],
  ])('texto: %s ≥ 4.5', (_n, fg, bg) => {
    expect(contraste(fg, bg)).toBeGreaterThanOrEqual(4.5)
  })

  it.each([
    ['neutral-400 sobre superficie', o.neutral[400], f.superficie],
    ['info-600 sobre superficie', o.info[600], f.superficie],
    ['warn-500 sobre superficie', o.warn[500], f.superficie],
    ['ruta destacada (#6F96FF) sobre la malla (#0F1729)', '#6F96FF', '#0F1729'],
    ['rótulo del mapa (#DCE1EA) sobre la malla', '#DCE1EA', '#0F1729'],
  ])('gráfico: %s ≥ 3', (_n, fg, bg) => {
    expect(contraste(fg, bg)).toBeGreaterThanOrEqual(3)
  })

  it('cada tono claro tiene su par oscuro (mismas claves)', () => {
    for (const grupo of Object.keys(paleta) as (keyof typeof paleta)[]) {
      expect(Object.keys(paletaOscura[grupo])).toEqual(Object.keys(paleta[grupo]))
    }
    expect(Object.keys(semanticos.oscuro)).toEqual(Object.keys(semanticos.claro))
  })
})
