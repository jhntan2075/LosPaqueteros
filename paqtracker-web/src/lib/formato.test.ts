import { describe, expect, it } from 'vitest';
import {
  capitalizar,
  diasDeDiferencia,
  formatearCronometro,
  formatearDiasHoras,
  formatearDuracion,
  formatearFechaLarga,
  formatearFechaNumerica,
  formatearHolgura,
  formatearHora,
  formatearHoraRelativa,
  formatearMiles,
  formatearMomento,
  sumarMinutos,
  unirAlternativas,
} from './formato';

const fecha = (d: number, h: number, m: number, s = 0) => new Date(2026, 2, d, h, m, s);

describe('formato', () => {
  it('separa miles con espacio', () => {
    expect(formatearMiles(999)).toBe('999');
    expect(formatearMiles(1305)).toBe('1 305');
    expect(formatearMiles(1234567)).toBe('1 234 567');
  });

  it('formatea hora y hora relativa al día de referencia', () => {
    expect(formatearHora(fecha(3, 7, 5))).toBe('07:05');
    expect(formatearHoraRelativa(fecha(3, 15, 15), fecha(3, 8, 0))).toBe('15:15');
    expect(formatearHoraRelativa(fecha(4, 23, 15), fecha(3, 8, 0))).toBe('23:15 +1d');
  });

  it('cuenta días calendario, no bloques de 24 h', () => {
    expect(diasDeDiferencia(fecha(3, 23, 59), fecha(4, 0, 1))).toBe(1);
    expect(diasDeDiferencia(fecha(3, 0, 1), fecha(3, 23, 59))).toBe(0);
  });

  it('describe el momento respecto del reloj', () => {
    const ref = fecha(3, 14, 0);
    expect(formatearMomento(fecha(3, 14, 32), ref)).toBe('hoy 14:32');
    expect(formatearMomento(fecha(4, 23, 0), ref)).toBe('mañana 23:00');
    expect(formatearMomento(fecha(6, 15, 0), ref)).toBe('06/03 15:00');
  });

  it('formatea duraciones en minutos', () => {
    expect(formatearDuracion(38)).toBe('38 min');
    expect(formatearDuracion(240)).toBe('4 h 00 min');
    expect(formatearDuracion(-5)).toBe('0 min');
  });

  it('formatea la holgura con signo si ya venció', () => {
    expect(formatearHolgura(56)).toBe('00:56');
    expect(formatearHolgura(-36)).toBe('-00:36');
    expect(formatearHolgura(0)).toBe('00:00');
  });

  it('formatea fechas largas y numéricas', () => {
    expect(formatearFechaLarga(fecha(28, 14, 37, 20))).toBe('28 mar 2026 · 14:37:20');
    expect(formatearFechaLarga(fecha(28, 14, 37, 20), false)).toBe('28 mar 2026 · 14:37');
    expect(formatearFechaNumerica(fecha(3, 0, 0))).toBe('03/03/2026 · 00:00');
    expect(formatearFechaNumerica(fecha(3, 0, 0), true)).toBe('03/03/2026 · 00:00:00');
  });

  it('formatea cronómetro y días/horas', () => {
    expect(formatearCronometro(21 * 60_000 + 14_000)).toBe('21:14');
    expect(formatearCronometro(3_909_000)).toBe('1:05:09');
    expect(formatearCronometro(-1)).toBe('00:00');
    expect(formatearDiasHoras(((4 * 24 + 9) * 60 + 12) * 60_000)).toBe('4 d 09 h 12 m');
    expect(formatearDiasHoras(((26 * 60 + 3) * 60 + 4) * 1000, true)).toBe('1 d 02 h 03 m 04 s');
  });

  it('suma minutos, capitaliza y une alternativas', () => {
    expect(sumarMinutos(fecha(3, 23, 30), 45).getTime()).toBe(fecha(4, 0, 15).getTime());
    expect(capitalizar('moto o auto')).toBe('Moto o auto');
    expect(unirAlternativas([])).toBe('');
    expect(unirAlternativas(['moto'])).toBe('moto');
    expect(unirAlternativas(['bicicleta', 'moto'])).toBe('bicicleta o moto');
    expect(unirAlternativas(['a', 'b', 'c'], 'y')).toBe('a, b y c');
  });
});
