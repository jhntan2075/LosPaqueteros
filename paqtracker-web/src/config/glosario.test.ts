import { describe, expect, it } from 'vitest';
import { nombreEscenario, tituloGrupoEntregas, tituloGrupoPedidos, tituloGrupoReplanificaciones } from './glosario';

describe('nombreEscenario', () => {
  it('"Hasta el colapso" no depende de los días', () => {
    expect(nombreEscenario('COLAPSO_LOGISTICO', 7)).toBe('Hasta el colapso');
  });

  it('una simulación de un día va en singular', () => {
    expect(nombreEscenario('SIMULACION_PERIODO', 1)).toBe('Simulación 1 día');
  });

  it('una simulación de varios días va en plural', () => {
    expect(nombreEscenario('SIMULACION_PERIODO', 5)).toBe('Simulación 5 días');
  });
});

describe('títulos de grupo de actividad', () => {
  it('arman el texto con la cantidad y la hora', () => {
    expect(tituloGrupoReplanificaciones(3, '10:59:00')).toBe('3 replanificaciones · última 10:59:00');
    expect(tituloGrupoPedidos(2)).toBe('+2 pedidos registrados');
    expect(tituloGrupoEntregas(4)).toBe('4 entregas');
  });
});
