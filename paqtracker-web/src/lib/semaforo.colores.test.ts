import { describe, expect, it } from 'vitest';
import { COLOR_HOLGURA_HEX, COLOR_SEMAFORO, TEXTO_SEMAFORO } from './semaforo';

describe('colores del semáforo', () => {
  it('el semáforo usa los colores del tema y las clases de token', () => {
    expect(COLOR_SEMAFORO).toEqual({ VACIO: '#64748B', VERDE: '#12805C', AMBAR: '#B44D08', ROJO: '#C81E3A' });
    expect(TEXTO_SEMAFORO.ROJO).toBe('text-critical-600');
    expect(Object.values(TEXTO_SEMAFORO).join(' ')).not.toMatch(/\[#/);
    expect(COLOR_HOLGURA_HEX.ROJO).toBe(COLOR_SEMAFORO.ROJO);
  });
});
