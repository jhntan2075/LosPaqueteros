import type { ResumenPedidos } from '../types/operacion';

// Datos de ejemplo de una corrida simulada mientras paqtracker-api no los publique.

/** Marcas sobre la línea de avance: minutos simulados desde el inicio de la corrida. */
export const MARCAS_AVANCE: { minuto: number; tipo: 'INCIDENCIA' | 'PLANIFICADOR' }[] = [
  { minuto: 7 * 60 + 40, tipo: 'INCIDENCIA' },
  { minuto: 19 * 60 + 15, tipo: 'PLANIFICADOR' },
  { minuto: 22 * 60 + 5, tipo: 'INCIDENCIA' },
  { minuto: 38 * 60 + 30, tipo: 'PLANIFICADOR' },
  { minuto: 46 * 60, tipo: 'INCIDENCIA' },
  { minuto: 49 * 60 + 20, tipo: 'PLANIFICADOR' },
  { minuto: 55 * 60 + 10, tipo: 'PLANIFICADOR' },
  { minuto: 61 * 60 + 45, tipo: 'INCIDENCIA' },
  { minuto: 69 * 60, tipo: 'PLANIFICADOR' },
  { minuto: 74 * 60 + 25, tipo: 'INCIDENCIA' },
  { minuto: 90 * 60, tipo: 'PLANIFICADOR' },
  { minuto: 98 * 60 + 40, tipo: 'INCIDENCIA' },
  { minuto: 101 * 60 + 5, tipo: 'INCIDENCIA' },
];

/** Indicadores en el instante del colapso (flota de 37 unidades de ConfiguracionDominio). */
export const RESUMEN_COLAPSO: ResumenPedidos = {
  total: 1136, entregados: 987, enPlazo: 986, fueraDePlazo: 1, enRuta: 112, enEspera: 37, sinRuta: 18, proximaEntregaMin: 0, saturacion: 1.18,
};

export const FLOTA_COLAPSO = {
  enRuta: 35,
  total: 37,
  disponibles: 0,
  averiadas: 2,
  porTipo: [
    { tipo: 'AUTO', enRuta: 10 },
    { tipo: 'MOTO', enRuta: 14 },
    { tipo: 'BICICLETA', enRuta: 11 },
  ],
};

export const RIESGO_COLAPSO = { rojo: 9, ambar: 24, holguraMinima: '-00:14' };

export const DIAGNOSTICO_COLAPSO = {
  antes: [
    { hora: '02:10', texto: 'Saturación del sistema cruzó 0,70', nivel: 'AMBAR' as const },
    { hora: '07:40', texto: 'Saturación alta: sin margen de flota', nivel: 'ROJO' as const },
    { hora: '08:05', texto: 'Almacén Intermedio 2 agotado (0 u)', nivel: 'ROJO' as const },
  ],
  pedido: {
    codigo: '#1188',
    plazo: 'Priorizado 4 h',
    cliente: 'C-0421',
    destino: '(58,33)',
    registrado: '29/08/2026 05:40',
    limite: '09:40',
    mejorEta: '10:14',
    holgura: '-00:34',
  },
  causa: { titulo: 'Capacidad de flota agotada', detalle: '35/37 en ruta' },
  almacenes: [
    { nombre: 'Intermedio 1', stock: 90, capacidad: 1000, nota: 'se agota en 3 h' },
    { nombre: 'Intermedio 2', stock: 0, capacidad: 1000, nota: 'agotado 08:05' },
  ],
  recarga: '14:00',
  factores: ['4 bloqueos simultáneos en D5 · +9,2 km promedio por ruta', 'Turno 07:00 retira 12 unidades durante el pico de demanda'],
};
