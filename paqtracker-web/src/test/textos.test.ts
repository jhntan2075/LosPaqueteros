import { describe, expect, it } from 'vitest';

// Guardia de textos: los términos retirados del glosario no deben volver a aparecer en la interfaz
// (spec §3). Solo revisa las cadenas listadas, no los comentarios que las mencionen por otro motivo.

const fuentes = import.meta.glob('/src/**/*.tsx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const componentes = Object.entries(fuentes).filter(([ruta]) => !ruta.endsWith('.test.tsx'));

const PROHIBIDOS = [
  'unidades de P',
  "'Resuelto'",
  'Interrumpida',
  'entrega posterior',
  'Resumen de la corrida',
  'Configuración de escenario"',
  'Destino (malla)',
  'Vehículo asignad',
];

describe('textos visibles', () => {
  it('la guardia lee los componentes', () => {
    expect(componentes.length).toBeGreaterThan(20);
  });

  it.each(PROHIBIDOS)('ningún texto visible usa "%s"', (texto) => {
    const conTexto = componentes.filter(([, codigo]) => codigo.replace(/s+/g, " ").includes(texto)).map(([ruta]) => ruta);
    expect(conTexto).toEqual([]);
  });
});
