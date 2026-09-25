// Tipos para la gestión de Ejecuciones y Escenarios (DA-08, LE-043)

export type TipoEscenario = 'DIA_A_DIA' | 'SIMULACION_5_DIAS' | 'COLAPSO_LOGISTICO';

export type EstadoEjecucion = 'CONFIGURADA' | 'EN_CURSO' | 'PAUSADA' | 'FINALIZADA' | 'COLAPSADA';

export type NivelSemaforo = 'VERDE' | 'AMBAR' | 'ROJO';

export interface ParametrosSemaforo {
  umbralVerdeMinutos: number; // Ej. hasta 4 horas para entrega
  umbralAmbarMinutos: number; // Ej. entre 4 y 2 horas
  umbralRojoMinutos: number;  // Ej. menos de 2 horas (crítico)
}

export interface ParametrosEjecucion {
  saltoConsumoScSegundos: number; // Cadencia de avance Sc (LE-057)
  saltoAlgoritmoSaMinutos: number; // Cadencia de planificación Sa (LE-058)
  tiempoMaximoPlanificadorMs: number; // Límite de cómputo del ejecutor
  factorAceleracionK: number; // k = 1 para día a día, k > 1 para simulación acelerada
  parametrosSemaforo: ParametrosSemaforo;
}

export interface IndicadoresOperacion {
  pedidosEntregadosATiempo: number;
  pedidosEntregadosConRetraso: number;
  pedidosPendientes: number;
  camionesOperativos: number;
  camionesAveriados: number;
  tiempoPromedioEntregaMinutos: number;
  tiempoComputoUltimoTaMs: number; // LE-059
  estadoSemaforoGlobal: NivelSemaforo;
}

export interface EjecucionInfo {
  id: string;
  nombre: string;
  tipoEscenario: TipoEscenario;
  estado: EstadoEjecucion;
  relojSimulado: string; // ISO 8601 o formato legible HH:mm
  relojReal: string;
  parametros: ParametrosEjecucion;
  indicadores: IndicadoresOperacion;
}
