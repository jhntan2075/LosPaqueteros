import { describe, expect, it } from 'vitest';

// Guardia de textos: los términos retirados del glosario no deben volver a aparecer en la interfaz
// (spec §3). Revisa el código de los componentes y servicios; si un comentario menciona uno de ellos,
// se reescribe el comentario.

const fuentes = import.meta.glob('/src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

const juntarEspacios = (texto: string) => texto.replace(/\s+/g, ' ');

const codigoRevisado = Object.entries(fuentes)
  .filter(([ruta]) => !/\.test\.tsx?$/.test(ruta) && ruta !== '/src/test/textos.test.ts')
  .map(([ruta, codigo]) => [ruta, juntarEspacios(codigo)] as const);

const PROHIBIDOS = [
  'unidades de P',
  "'Resuelto'",
  'Interrumpida',
  'entrega posterior',
  'Resumen de la corrida',
  'Configuración de escenario"',
  'Destino (malla)',
  'Vehículo asignad',
  'de la corrida',
  'Ver corrida',
  'Nueva corrida',
  'Vehículo recomendado',
];

const archivosCon = (texto: string, lista: readonly (readonly [string, string])[]) =>
  lista.filter(([, codigo]) => codigo.includes(texto)).map(([ruta]) => ruta);

describe('textos visibles', () => {
  it('la guardia lee los componentes y servicios', () => {
    expect(codigoRevisado.length).toBeGreaterThan(50);
  });

  it('detecta un texto prohibido, aunque el código lo parta en dos líneas', () => {
    const muestra = [['/src/muestra.tsx', juntarEspacios('<p>Ver el resumen de\n    la corrida</p>')]] as const;
    expect(archivosCon('de la corrida', muestra)).toEqual(['/src/muestra.tsx']);
  });

  it('ningún componente fija el tamaño de letra en píxeles: usa text-caption, text-body, text-title-sm o text-title', () => {
    const conPixeles = codigoRevisado.filter(([, codigo]) => /text-\[\d+px\]/.test(codigo)).map(([ruta]) => ruta);
    expect(conPixeles).toEqual([]);
  });

  it('detecta un tamaño en píxeles aunque vaya con otras clases', () => {
    expect(/text-\[\d+px\]/.test(juntarEspacios('className="font-medium text-[14px] leading-5"'))).toBe(true);
    expect(/text-\[\d+px\]/.test('className="text-body"')).toBe(false);
  });

  it.each(PROHIBIDOS)('ningún texto visible usa "%s"', (texto) => {
    expect(archivosCon(texto, codigoRevisado)).toEqual([]);
  });
});
