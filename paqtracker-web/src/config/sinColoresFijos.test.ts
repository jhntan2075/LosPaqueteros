import { describe, expect, it } from 'vitest';

// Guarda del design system: los componentes usan los tokens de la paleta (tailwind.config.js) o las
// constantes de config/colores.ts, nunca hex sueltos ni la paleta por defecto de Tailwind. Así un cambio
// de paleta se hace en un solo lugar y el mapa y la interfaz no se desalinean.

const modulos = import.meta.glob<string>('../components/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true });
const fuentes = Object.entries(modulos)
  .filter(([ruta]) => !ruta.includes('.test.'))
  .map(([ruta, texto]) => ({ ruta: ruta.replace('../', ''), texto }));

/** Coincidencias con su archivo, para que el error diga dónde está cada una. */
const buscar = (patron: RegExp) =>
  fuentes.flatMap(({ ruta, texto }) => [...texto.matchAll(patron)].map((m) => `${ruta}: ${m[0]}`));

describe('componentes sin colores fijos', () => {
  it('revisa todos los componentes', () => {
    expect(fuentes.length).toBeGreaterThan(30);
  });

  it('no usan hex literales (ni en clases ni en SVG)', () => {
    expect(buscar(/#[0-9A-Fa-f]{6}\b/g)).toEqual([]);
  });

  it('no usan la paleta por defecto de Tailwind', () => {
    const familias = 'slate|gray|zinc|blue|indigo|sky|cyan|emerald|green|teal|rose|red|pink|amber|orange|yellow';
    const patron = new RegExp(`\\b(?:text|bg|border|ring|fill|stroke|divide|accent|outline)-(?:${familias})-\\d{2,3}\\b`, 'g');
    expect(buscar(patron)).toEqual([]);
  });
});
