// @vitest-environment jsdom
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InformeCorrida } from '../../components/simulacion/InformeCorrida';
import { clienteApi, ErrorDeApi } from '../../services/clienteApi';
import type { EjecucionApi, PlanEstableApi } from '../../types/api';
import { INICIO_MS } from '../fabricas';
import { MIN, datosRubrica, prepararEntornoMapa } from './escenario';
import { montarOperacion, renderConDatos } from './montaje';

// Rúbrica 91.EvaSw · G08 (simulación del periodo), G09 (cierre del día a día) y G10 (colapso): reporte de la
// última planificación estable, con una ruta por unidad y sus paradas en orden.

const ejecucion: EjecucionApi = {
  id: 'sim-1',
  nombre: 'Simulación 5 días',
  tipoEscenario: 'SIMULACION_PERIODO',
  estado: 'FINALIZADA',
  algoritmo: 'GA',
  fechaInicio: '2026-03-03',
  horaInicio: '00:00:00',
  dias: 5,
  relojSimulado: null,
  relojReal: null,
  parametros: { saltoConsumoScSegundos: 1, saltoAlgoritmoSaMinutos: 30, factorAceleracionK: 180, fraccionSemaforoRojo: 0.15, fraccionSemaforoAmbar: 0.4 },
  indicadores: null,
  flota: { autos: 10, motos: 15, bicicletas: 12 },
};

const plan = (sobrescribir: Partial<PlanEstableApi> = {}): PlanEstableApi => ({
  ejecucionId: 'sim-1',
  tipoEscenario: 'SIMULACION_PERIODO',
  algoritmo: 'GA',
  instanteMs: INICIO_MS + 30 * MIN,
  tiempoComputoMs: 850,
  unidadesDespachadas: 2,
  rutas: [
    {
      unidad: 'A-01',
      tipo: 'AUTO',
      almacenOrigen: 'CENTRAL',
      salidaMs: INICIO_MS + 30 * MIN,
      regresoMs: INICIO_MS + 200 * MIN,
      distanciaKm: 42,
      carga: 5,
      capacidad: 25,
      paradas: [
        { pedido: 'P-00001', destino: { x: 30, y: 18 }, cantidad: 3, llegadaMs: INICIO_MS + 60 * MIN, horaLimiteMs: INICIO_MS + 120 * MIN },
        { pedido: 'P-00002', destino: { x: 40, y: 20 }, cantidad: 2, llegadaMs: INICIO_MS + 100 * MIN, horaLimiteMs: INICIO_MS + 90 * MIN },
      ],
    },
    {
      unidad: 'M-03',
      tipo: 'MOTO',
      almacenOrigen: 'INTERMEDIO_1',
      salidaMs: INICIO_MS + 45 * MIN,
      regresoMs: INICIO_MS + 150 * MIN,
      distanciaKm: 18,
      carga: 4,
      capacidad: 8,
      paradas: [{ pedido: 'P-00003', destino: { x: 10, y: 35 }, cantidad: 4, llegadaMs: INICIO_MS + 80 * MIN, horaLimiteMs: INICIO_MS + 600 * MIN }],
    },
  ],
  pedidosSinAsignar: ['P-00009'],
  colapso: null,
  ...sobrescribir,
});

beforeEach(() => {
  prepararEntornoMapa();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const montarInforme = (estado: 'COMPLETADA' | 'COLAPSO' = 'COMPLETADA') =>
  renderConDatos(<InformeCorrida ejecucion={ejecucion} estado={estado} onVolverACorrida={() => {}} onNuevaCorrida={() => {}} />, datosRubrica());

describe('Rúbrica 91.EvaSw · reporte de la última planificación estable', () => {
  it('G08 · al terminar la simulación, el informe muestra el plan: una ruta por unidad con sus paradas en orden', async () => {
    vi.spyOn(clienteApi, 'planEstable').mockResolvedValue(plan());
    montarInforme();
    fireEvent.click(screen.getByRole('tab', { name: 'Última planificación estable' }));
    const reporte = within(await screen.findByRole('region', { name: 'Última planificación estable' }));
    expect(reporte.getByText(/Planificada el \d{2}\/\d{2} \d{2}:\d{2} \(reloj simulado\) · GA · Ta 850 ms · 2 unidades salieron/)).toBeTruthy();
    const filas = reporte.getAllByRole('row').slice(1).map((f) => f.textContent);
    expect(filas[0]).toMatch(/Auto A-01.*Central.*2.*5\/25 · 20 %.*42/);
    expect(filas[1]).toMatch(/Moto M-03.*Intermedio 1/);
    fireEvent.click(reporte.getByRole('button', { name: /Auto A-01/ }));
    const paradas = within(reporte.getByRole('list', { name: 'Paradas de A-01' })).getAllByRole('listitem').map((li) => li.textContent);
    expect(paradas[0]).toMatch(/^1\.P-00001.*3 paq\..*60 min de holgura/);
    expect(paradas[1]).toMatch(/^2\.P-00002.*10 min tarde/);
    expect(reporte.getByText('P-00009')).toBeTruthy();
  });

  it('G10 · tras el colapso, el informe muestra el plan anterior y el pedido que lo causó', async () => {
    vi.spyOn(clienteApi, 'planEstable').mockResolvedValue(plan({ colapso: { instanteMs: INICIO_MS + 300 * MIN, pedido: 'P-00007', causa: 'PLAZO_VENCIDO' } }));
    montarInforme('COLAPSO');
    fireEvent.click(screen.getByRole('tab', { name: 'Última planificación estable (antes del colapso)' }));
    const aviso = await screen.findByRole('status');
    expect(aviso.textContent).toMatch(/Plan anterior al colapso\..*P-00007/);
  });

  it('G09 · en la operación día a día, "Generar reporte de cierre" abre el plan sin detener la operación', async () => {
    vi.spyOn(clienteApi, 'planEstable').mockResolvedValue(plan({ ejecucionId: 'dia-a-dia', tipoEscenario: 'DIA_A_DIA' }));
    const detener = vi.spyOn(clienteApi, 'detener');
    montarOperacion({ datos: datosRubrica({ tipoEscenario: 'DIA_A_DIA' }), subvista: 'resumen' });
    fireEvent.click(screen.getByRole('button', { name: 'Generar reporte de cierre' }));
    const dialogo = within(screen.getByRole('dialog', { name: 'Reporte de cierre · operación día a día' }));
    expect(dialogo.getByText(/No detiene la operación\./)).toBeTruthy();
    expect(await dialogo.findByRole('button', { name: /Auto A-01/ })).toBeTruthy();
    expect(dialogo.getByRole('button', { name: 'Actualizar' })).toBeTruthy();
    expect(detener).not.toHaveBeenCalled();
    fireEvent.click(dialogo.getByRole('button', { name: 'Cerrar' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('sin ninguna planificación todavía, explica cuándo habrá una en vez de mostrar un error', async () => {
    vi.spyOn(clienteApi, 'planEstable').mockRejectedValue(new ErrorDeApi(404, 'No existe'));
    montarInforme();
    fireEvent.click(screen.getByRole('tab', { name: 'Última planificación estable' }));
    expect(await screen.findByText(/todavía no planificó/)).toBeTruthy();
  });
});
