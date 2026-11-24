// @vitest-environment jsdom
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { prepararEntornoMapa } from '../../test/rubrica/escenario'
import { renderConDatos } from '../../test/rubrica/montaje'
import { GridMap } from './GridMap'

beforeEach(() => prepararEntornoMapa())
afterEach(cleanup)

describe('GridMap · lienzo claro en los dos temas', () => {
  it('el mapa principal no aplica los ajustes oscuros del lienzo, pero conserva su fondo claro', () => {
    const { container } = renderConDatos(
      <GridMap
        unidades={[]}
        destinos={[]}
        bloqueos={[]}
        seleccion={null}
        riesgo={{ rojo: 0, ambar: 0 }}
        onSeleccionar={() => {}}
        onAbrirIncidencias={() => {}}
      />,
    )
    const svg = container.querySelector('svg.absolute')
    expect(svg).toBeTruthy()
    expect(svg!.classList.contains('lienzo-mapa')).toBe(false)
    expect(container.querySelector('div.relative.bg-lienzo-mapa')).toBeTruthy()
  })
})
