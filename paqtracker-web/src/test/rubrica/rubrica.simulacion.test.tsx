// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfiguracionEscenario } from '../../components/simulacion/ConfiguracionEscenario';
import { InformeCorrida } from '../../components/simulacion/InformeCorrida';
import { clienteApi } from '../../services/clienteApi';
import type { EjecucionApi } from '../../types/api';
import { datosRubrica } from './escenario';
import { renderConDatos } from './montaje';

// Rúbrica c.1inf54.26-2 · criterio 1 de la segunda tabla (fecha y hora de inicio), criterios generales
// de carga por GUI (11 pedidos, 13 flota) y de parámetros del planificador (6 Ta, 7 Sa, 8 Sc), y
// "OTROS" 79 (reporte final). Las brechas van con `it.fails` (ver rubrica.mapa.test.tsx).

const ejecucion: EjecucionApi = {
  id: 'sim-1',
  nombre: 'Simulación 5 días',
  tipoEscenario: 'SIMULACION_PERIODO',
  estado: 'EN_CURSO',
  algoritmo: 'GA',
  fechaInicio: '2026-03-03',
  dias: 5,
  relojSimulado: null,
  relojReal: null,
  parametros: { saltoConsumoScSegundos: 1, saltoAlgoritmoSaMinutos: 30, factorAceleracionK: 180, fraccionSemaforoRojo: 0.15, fraccionSemaforoAmbar: 0.4 },
  indicadores: null,
  flota: { autos: 10, motos: 15, bicicletas: 12 },
};

beforeEach(() => {
  vi.spyOn(clienteApi, 'listarEjecuciones').mockResolvedValue([]);
  vi.spyOn(clienteApi, 'crearEjecucion').mockResolvedValue({ ...ejecucion, estado: 'CONFIGURADA' });
  vi.spyOn(clienteApi, 'iniciar').mockResolvedValue(ejecucion);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const botonEjecutar = () => screen.getByRole('button', { name: 'Ejecutar simulación' }) as HTMLButtonElement;

describe('Rúbrica · inicio de la simulación semanal', () => {
  it('C1 · pide la fecha de inicio y no deja ejecutar sin ella', async () => {
    const onAbrir = vi.fn();
    render(<ConfiguracionEscenario onAbrir={onAbrir} />);
    expect(botonEjecutar().disabled).toBe(true);
    expect(screen.getByText(/Define la fecha de inicio/)).toBeTruthy();

    fireEvent.change(screen.getByLabelText(/Fecha de inicio/), { target: { value: '2026-03-03' } });
    expect(botonEjecutar().disabled).toBe(false);
    fireEvent.click(botonEjecutar());

    await waitFor(() => expect(onAbrir).toHaveBeenCalledWith(ejecucion));
    expect(clienteApi.crearEjecucion).toHaveBeenCalledWith(expect.objectContaining({ tipoEscenario: 'SIMULACION_PERIODO', fechaInicio: '2026-03-03', dias: 5 }));
  });

  it.fails('C1 (brecha) · pide también la hora de inicio (hoy se fija a las 00:00)', () => {
    render(<ConfiguracionEscenario onAbrir={() => {}} />);
    expect(screen.getByLabelText(/Hora de inicio/)).toBeTruthy();
  });
});

describe('Rúbrica · carga de datos por GUI', () => {
  it('G11 · los pedidos (ventas.AAAAMM.txt) se suben desde la interfaz y el servidor los valida', async () => {
    const subir = vi.spyOn(clienteApi, 'subirVentas').mockResolvedValue({ mes: '202603', registrosValidos: 1234, lineasInvalidas: [], guardado: true } as never);
    render(<ConfiguracionEscenario onAbrir={() => {}} />);
    const archivo = new File(['01d00h05m:10,20,c001,3,24\n'], 'ventas.202603.txt', { type: 'text/plain' });
    fireEvent.change(screen.getByLabelText('Pedidos (ventas.AAAAMM.txt)'), { target: { files: [archivo] } });

    await waitFor(() => expect(subir).toHaveBeenCalledWith(archivo, '202603'));
    expect(await screen.findByText('Guardado para el mes 202603.')).toBeTruthy();
    expect(screen.getByText(/1 234 pedidos · 202603/)).toBeTruthy();
  });

  it('G11 · un archivo de pedidos con líneas inválidas se informa y no se guarda', async () => {
    vi.spyOn(clienteApi, 'subirVentas').mockResolvedValue({ mes: '202603', registrosValidos: 1, lineasInvalidas: [2, 7], guardado: false } as never);
    render(<ConfiguracionEscenario onAbrir={() => {}} />);
    fireEvent.change(screen.getByLabelText('Pedidos (ventas.AAAAMM.txt)'), { target: { files: [new File(['x'], 'ventas.202603.txt')] } });
    expect(await screen.findByText(/2 líneas no respetan el formato \(línea 2, 7\)/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/Fecha de inicio/), { target: { value: '2026-03-03' } });
    expect(botonEjecutar().disabled).toBe(true);
  });

  it('G13 · la flota se configura desde la interfaz y se envía al crear la simulación', async () => {
    render(<ConfiguracionEscenario onAbrir={() => {}} />);
    fireEvent.change(screen.getByLabelText(/Fecha de inicio/), { target: { value: '2026-03-03' } });
    fireEvent.change(screen.getByLabelText('Autos'), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText('Motos'), { target: { value: '6' } });
    fireEvent.change(screen.getByLabelText('Bicicletas'), { target: { value: '2' } });
    fireEvent.click(botonEjecutar());
    await waitFor(() =>
      expect(clienteApi.crearEjecucion).toHaveBeenCalledWith(expect.objectContaining({ flota: { autos: 4, motos: 6, bicicletas: 2 } })),
    );
  });

  it('G13 · una flota fuera de rango (más de 50 por tipo) no se acepta', () => {
    render(<ConfiguracionEscenario onAbrir={() => {}} />);
    fireEvent.change(screen.getByLabelText(/Fecha de inicio/), { target: { value: '2026-03-03' } });
    fireEvent.change(screen.getByLabelText('Autos'), { target: { value: '51' } });
    expect(botonEjecutar().disabled).toBe(true);
    expect(screen.getByText(/una flota de 1 a 50 unidades por tipo/)).toBeTruthy();
  });
});

describe('Rúbrica · reporte final de la corrida', () => {
  const montarInforme = (estado: 'COMPLETADA' | 'COLAPSO' = 'COMPLETADA') =>
    renderConDatos(<InformeCorrida ejecucion={ejecucion} estado={estado} onVolverACorrida={() => {}} onNuevaCorrida={() => {}} />, datosRubrica());
  const fila = (tarjeta: string, etiqueta: string) =>
    within(screen.getByRole('heading', { name: tarjeta }).parentElement!).getByText(etiqueta).parentElement!.textContent;

  it('C79 · presenta el reporte final con resultado, indicadores y parámetros de la corrida', () => {
    montarInforme();
    expect(screen.getByRole('heading', { name: 'Informe de la corrida' })).toBeTruthy();
    expect(fila('Indicadores', 'Pedidos')).toContain('4');
    expect(fila('Indicadores', 'Entregados')).toContain('1');
    expect(fila('Indicadores', 'Cumplimiento en plazo')).toContain('100,0 %');
    expect(fila('Indicadores', 'Distancia recorrida')).toContain('321 km');
    expect(fila('Resultado', 'Planificaciones')).toContain('12');
    expect(fila('Parámetros de la corrida', 'Algoritmo')).toContain('GA');
  });

  it('C79 · en el escenario de colapso el reporte marca el instante del colapso', () => {
    montarInforme('COLAPSO');
    expect(screen.getByText('Instante del colapso')).toBeTruthy();
  });

  it('G6 / G7 / G8 · el reporte informa Ta (última planificación), Sa (salto del algoritmo) y Sc (salto del consumo)', () => {
    montarInforme();
    expect(fila('Resultado', 'Tiempo de la última planificación')).toContain('850 ms');
    expect(fila('Parámetros de la corrida', 'Planifica cada')).toContain('30 min simulados');
    expect(fila('Parámetros de la corrida', 'Actualiza la vista cada')).toContain('1 s reales');
    expect(fila('Parámetros de la corrida', 'Factor de aceleración (k)')).toContain('×180');
  });
});
