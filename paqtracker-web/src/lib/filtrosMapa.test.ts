// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { SIN_FILTROS, almacenPasaFiltros, alternar, cantidadFiltros, guardarFiltros, leerFiltros, unidadPasaFiltros } from './filtrosMapa';
import type { AlmacenOperacion } from '../types/operacion';

const auto = (carga: number) => ({ tipo: 'AUTO' as const, carga, capacidad: 24 });
const intermedio = (nivelStock: AlmacenOperacion['nivelStock']): AlmacenOperacion => ({
  id: 'INTERMEDIO_1',
  stock: 0,
  capacidad: 100,
  porcentajeStock: 0,
  nivelStock,
  stockBajo: false,
});

afterEach(() => localStorage.clear());

describe('filtros del mapa', () => {
  it('sin filtros se muestra todo', () => {
    expect(unidadPasaFiltros(SIN_FILTROS, auto(0))).toBe(true);
    expect(almacenPasaFiltros(SIN_FILTROS, 'INTERMEDIO_1', intermedio('ROJO'))).toBe(true);
  });

  it('el tipo y la carga se combinan (y); dentro de un grupo, cualquiera de los marcados (o)', () => {
    const f = { ...SIN_FILTROS, tipos: ['AUTO' as const], carga: ['VACIO' as const, 'ROJO' as const] };
    expect(unidadPasaFiltros(f, auto(0))).toBe(true);
    expect(unidadPasaFiltros(f, auto(24))).toBe(true);
    expect(unidadPasaFiltros(f, auto(10))).toBe(false);
    expect(unidadPasaFiltros(f, { tipo: 'MOTO', carga: 0, capacidad: 8 })).toBe(false);
  });

  it('el filtro de stock incluye vacío y nunca oculta al central', () => {
    const f = { ...SIN_FILTROS, stock: ['VACIO' as const] };
    expect(almacenPasaFiltros(f, 'INTERMEDIO_1', intermedio('VACIO'))).toBe(true);
    expect(almacenPasaFiltros(f, 'INTERMEDIO_1', intermedio('VERDE'))).toBe(false);
    expect(almacenPasaFiltros(f, 'CENTRAL', undefined)).toBe(true);
  });

  it('alternar marca y desmarca; cantidadFiltros cuenta lo marcado', () => {
    expect(alternar(['AUTO'], 'MOTO')).toEqual(['AUTO', 'MOTO']);
    expect(alternar(['AUTO', 'MOTO'], 'AUTO')).toEqual(['MOTO']);
    expect(cantidadFiltros({ tipos: ['AUTO'], carga: ['VACIO', 'ROJO'], stock: [] })).toBe(3);
  });

  it('se recuerdan en el navegador y se descartan valores inválidos', () => {
    guardarFiltros({ tipos: ['BICICLETA'], carga: ['AMBAR'], stock: [] });
    expect(leerFiltros()).toEqual({ tipos: ['BICICLETA'], carga: ['AMBAR'], stock: [] });
    localStorage.setItem('paqtracker.filtrosMapa', '{"tipos":["AVION"],"carga":"x"}');
    expect(leerFiltros()).toEqual(SIN_FILTROS);
  });
});
