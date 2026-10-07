// Modelos de vista del módulo Simulación (configuración de escenario, corrida, informe).

/** Escenarios que se configuran aquí; el día a día corre en Operación. */
export type EscenarioSimulacion = 'SIMULACION_PERIODO' | 'COLAPSO_LOGISTICO';

export type TipoArchivo = 'pedidos' | 'bloqueos';

export interface ArchivoCargado {
  nombre: string;
  /** Mes al que se cargó, YYYYMM. */
  mes: string;
  registros: number;
  /** Números de línea (1-based) que no respetan el formato; con alguna, el servidor no guarda el archivo. */
  lineasInvalidas: number[];
  guardado: boolean;
}

/** Estado de la corrida para el encabezado: en ejecución, colapsada o completada. */
export type EstadoCorrida = 'EJECUCION' | 'COLAPSO' | 'COMPLETADA';

/** Marca sobre la línea de avance: minuto simulado desde el inicio de la corrida. */
export interface MarcaAvance {
  id: string;
  minuto: number;
  tipo: 'INCIDENCIA' | 'PLANIFICADOR';
}
