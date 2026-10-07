import { INICIOS_TURNO_MINUTOS } from '../config/dominio';

// Turnos de 8 h (LE-023) a partir del reloj simulado.

const MINUTOS_POR_DIA = 1440;
const DURACION_TURNO_MINUTOS = 480;

const hora = (minutos: number) => `${String(Math.floor((minutos % MINUTOS_POR_DIA) / 60)).padStart(2, '0')}:00`;
const rango = (inicio: number) => `${hora(inicio)}–${hora(inicio + DURACION_TURNO_MINUTOS)}`;

/** Turno vigente y el siguiente, p. ej. { actual: '07:00–15:00', siguiente: '15:00–23:00' }. */
export function turnoVigente(reloj: Date): { actual: string; siguiente: string } {
  const minutos = reloj.getHours() * 60 + reloj.getMinutes();
  // Antes del primer inicio del día sigue vigente el turno nocturno que empezó el día anterior.
  const indice = INICIOS_TURNO_MINUTOS.reduce((elegido, inicio, i) => (minutos >= inicio ? i : elegido), INICIOS_TURNO_MINUTOS.length - 1);
  return {
    actual: rango(INICIOS_TURNO_MINUTOS[indice]),
    siguiente: rango(INICIOS_TURNO_MINUTOS[(indice + 1) % INICIOS_TURNO_MINUTOS.length]),
  };
}
