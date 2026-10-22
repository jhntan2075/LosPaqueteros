import { describe, expect, it } from 'vitest';
import { turnoVigente } from './turnos';

const a = (h: number, m = 0) => new Date(2026, 2, 3, h, m);

describe('turnoVigente', () => {
  it('devuelve el turno que contiene la hora y el siguiente', () => {
    expect(turnoVigente(a(7))).toEqual({ actual: '07:00–15:00', siguiente: '15:00–23:00' });
    expect(turnoVigente(a(14, 59))).toEqual({ actual: '07:00–15:00', siguiente: '15:00–23:00' });
    expect(turnoVigente(a(15))).toEqual({ actual: '15:00–23:00', siguiente: '23:00–07:00' });
  });

  it('el turno nocturno cruza la medianoche', () => {
    expect(turnoVigente(a(23, 30))).toEqual({ actual: '23:00–07:00', siguiente: '07:00–15:00' });
    expect(turnoVigente(a(2))).toEqual({ actual: '23:00–07:00', siguiente: '07:00–15:00' });
    expect(turnoVigente(a(6, 59)).actual).toBe('23:00–07:00');
  });
});
