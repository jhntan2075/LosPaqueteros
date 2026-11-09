import { describe, expect, it } from 'vitest';

// Candado del sistema visual (docs/propuesta-unificacion-ui.md, fase 6): el estilo vive en los tokens de
// tailwind.config.js y en src/components/ui. Si esta prueba falla, usa el token equivalente (tabla 2.1 y
// escala 2.2 de la propuesta, o docs/design-system.md) en vez de escribir el valor a mano.

const CRUDOS = import.meta.glob(['../components/**/*.{ts,tsx}', '!../components/**/*.test.{ts,tsx}', '../App.tsx'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const FUENTES = Object.entries(CRUDOS).map(([ruta, contenido]) => ({
  ruta: ruta.replace(/^\.\.\//, ''),
  lineas: contenido.split('\n'),
}));

/**
 * Excepciones conocidas: archivo + valor exacto. Cada una existe porque una prueba de rúbrica verifica ese
 * valor literal; si la prueba cambia, la excepción se borra.
 */
const EXCEPCIONES: { ruta: string; valor: string; motivo: string }[] = [
  { ruta: 'components/simulacion/EncabezadoCorrida.tsx', valor: 'text-[11px]', motivo: 'rubrica.tiempos-flota C39' },
  { ruta: 'components/simulacion/EncabezadoCorrida.tsx', valor: 'text-[14px]', motivo: 'rubrica.tiempos-flota C39' },
  { ruta: 'components/simulacion/EncabezadoCorrida.tsx', valor: 'text-[16px]', motivo: 'rubrica.tiempos-flota C39' },
  { ruta: 'components/simulacion/EncabezadoCorrida.tsx', valor: 'text-[20px]', motivo: 'rubrica.tiempos-flota C16' },
  { ruta: 'components/operacion/Trazabilidad.tsx', valor: 'bg-[#1E40AF]', motivo: 'PanelLateral.pedido.test: hito más reciente' },
];

/** Carpetas que dibujan el dominio en SVG (mapa, ilustración del login): pueden declarar colores como dato. */
const DIBUJO_DEL_DOMINIO = ['components/map/', 'components/sesion/IlustracionOperacion.tsx'];

const REGLAS: { nombre: string; patron: RegExp; soloFuera?: string[] }[] = [
  { nombre: 'color hex en una clase (`bg-[#…]`)', patron: /\b[a-z][a-z0-9:-]*-\[#[0-9a-fA-F]{3,8}\]/g },
  { nombre: 'tamaño de letra en píxeles (`text-[Npx]`)', patron: /\btext-\[\d+(\.\d+)?px\]/g },
  {
    nombre: 'color por defecto de Tailwind (`slate-500`, `blue-600`…)',
    patron:
      /\b(bg|text|border|ring|fill|stroke|divide|outline|from|to|via|accent|caret|decoration|placeholder)-(slate|gray|zinc|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/g,
  },
  { nombre: '`font-bold` (la escala usa 400, 500 y 600)', patron: /\bfont-bold\b/g },
  { nombre: '`bg-white` (usa `bg-superficie`, que cambia con el tema)', patron: /\bbg-white\b/g },
  { nombre: 'color hex como texto fuera del dibujo del dominio', patron: /['"`]#[0-9a-fA-F]{6}\b/g, soloFuera: DIBUJO_DEL_DOMINIO },
];

const esExcepcion = (ruta: string, valor: string) => EXCEPCIONES.some((e) => e.ruta === ruta && e.valor === valor);

describe('sistema visual: sin valores sueltos en src/components', () => {
  it.each(REGLAS.map((r) => [r.nombre, r] as const))('sin %s', (_nombre, regla) => {
    const hallazgos: string[] = [];
    for (const { ruta, lineas } of FUENTES) {
      if (regla.soloFuera?.some((prefijo) => ruta.startsWith(prefijo))) continue;
      lineas.forEach((linea, i) => {
        if (/^\s*(\/\/|\*|\/\*)/.test(linea)) return; // comentarios
        for (const [valor] of linea.matchAll(regla.patron)) {
          if (!esExcepcion(ruta, valor)) hallazgos.push(`${ruta}:${i + 1}  ${valor}`);
        }
      });
    }
    expect(hallazgos, `Reemplaza por tokens:\n${hallazgos.join('\n')}`).toEqual([]);
  });

  it('lee los archivos de src/components', () => {
    expect(FUENTES.length).toBeGreaterThan(50);
    expect(FUENTES.some((f) => f.ruta === 'App.tsx')).toBe(true);
  });

  it('cada excepción sigue haciendo falta (si ya no aparece, bórrala de la lista)', () => {
    const sobrantes = EXCEPCIONES.filter(({ ruta, valor }) => !FUENTES.find((f) => f.ruta === ruta)?.lineas.some((l) => l.includes(valor)));
    expect(sobrantes).toEqual([]);
  });
});
