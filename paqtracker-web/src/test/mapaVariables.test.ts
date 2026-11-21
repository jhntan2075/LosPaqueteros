/// <reference types="node" />
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Vitest no entrega el contenido de un `.css` importado con `?raw`: se lee del disco (se corre desde la raíz del proyecto).
const css = readFileSync(join(process.cwd(), 'src', 'index.css'), 'utf-8');

/** Texto entre llaves del primer bloque cuyo selector es exactamente `selector`. */
function bloque(selector: string): string {
  const inicio = css.search(new RegExp(`(^|\\n)${selector.replace('.', '\\.')} \\{`));
  expect(inicio, `no hay un bloque "${selector} {" en index.css`).toBeGreaterThanOrEqual(0);
  const abre = css.indexOf('{', inicio);
  return css.slice(abre + 1, css.indexOf('}', abre));
}

const variablesMapa = (texto: string) => Array.from(texto.matchAll(/(--mapa-[\w-]+)\s*:/g), (m) => m[1]).sort();

describe('Modo oscuro del mapa · variables', () => {
  const claras = variablesMapa(bloque(':root'));
  const oscuras = variablesMapa(bloque(':root.oscuro'));

  it('define las variables del mapa para el tema claro', () => {
    expect(claras).toEqual(
      [
        '--mapa-borde',
        '--mapa-cuadricula',
        '--mapa-eje',
        '--mapa-halo',
        '--mapa-recorrido',
        '--mapa-rotulo',
        '--mapa-rotulo-fuerte',
        '--mapa-ruta',
        '--mapa-sobre-acento',
      ].sort(),
    );
  });

  it('cada variable del mapa del tema claro tiene su valor en el tema oscuro', () => {
    expect(oscuras).toEqual(claras);
  });

  it('ninguna regla reemplaza colores del lienzo buscando un hex exacto, salvo los que se conservan a propósito', () => {
    // #1E40AF: lo fijan las pruebas de la rúbrica. #F8FAFC y #E2E8F0: fondo y cuadrícula del minimapa y
    // anillo de las unidades en el símbolo (no son colores del lienzo principal).
    const conservados = new Set(['#1E40AF', '#F8FAFC', '#E2E8F0']);
    const selectores = css.match(/\.lienzo-mapa[^{]*\{/g) ?? [];
    const hex = selectores.flatMap((selector) => Array.from(selector.matchAll(/\[(?:stroke|fill)="(#[0-9A-Fa-f]+)"\]/g), (m) => m[1].toUpperCase()));
    expect(hex.length).toBeGreaterThan(0);
    expect(hex.filter((h) => !conservados.has(h))).toEqual([]);
  });
});
