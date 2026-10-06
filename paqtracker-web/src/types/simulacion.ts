// Modelos de vista del módulo Simulación (configuración de escenario, corrida, informe).

/** Escenarios que se configuran aquí; el día a día corre en Operación. */
export type EscenarioSimulacion = 'CINCO_DIAS' | 'COLAPSO';

export type TipoArchivo = 'pedidos' | 'bloqueos' | 'averias';

export interface ArchivoCargado {
  nombre: string;
  registros: number;
  /** Números de línea (1-based) que no respetan el formato esperado. */
  lineasInvalidas: number[];
}

export interface ConfiguracionCorrida {
  escenario: EscenarioSimulacion;
  inicio: Date;
  archivos: Record<TipoArchivo, ArchivoCargado>;
  /** Cortes del semáforo de holgura (CF-02), en fracción del plazo; solo para esta corrida. */
  corteVerde: number;
  corteRojo: number;
}

export type VistaSimulacion = 'configuracion' | 'corrida' | 'informe';
