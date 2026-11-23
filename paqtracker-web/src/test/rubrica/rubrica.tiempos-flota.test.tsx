// @vitest-environment jsdom
import { act, cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TopNavbar } from '../../components/layout/TopNavbar';
import { EstadoFlota } from '../../components/operacion/EstadoFlota';
import { ResumenMapa } from '../../components/map/ResumenMapa';
import { EncabezadoCorrida } from '../../components/simulacion/EncabezadoCorrida';
import { datosRubrica } from './escenario';
import { renderConDatos } from './montaje';

// Rúbrica c.1inf54.26-2 · criterios 35–41: relojes y tiempos de la simulación, y nivel de uso de la
// flota total. Las brechas van con `it.fails` (ver rubrica.mapa.test.tsx).

afterEach(cleanup);

const INICIO = new Date(2026, 0, 5, 0, 0, 0);
/** 1 d 02 h 03 m 04 s simulados después del inicio. */
const SIMULADO_MS = ((26 * 60 + 3) * 60 + 4) * 1000;
const RELOJ = new Date(INICIO.getTime() + SIMULADO_MS);
/** 8 min 30 s reales de ejecución. */
const REAL_MS = (8 * 60 + 30) * 1000;

function montarEncabezado() {
  return render(
    <EncabezadoCorrida
      escenario="SIMULACION_PERIODO"
      estado="EJECUCION"
      inicio={INICIO}
      relojSimulado={RELOJ}
      simuladoMs={SIMULADO_MS}
      diasTotales={5}
      transcurridoRealMs={REAL_MS}
      factorAceleracion={180}
      marcas={[]}
      onDetener={async () => true}
      onSalir={() => {}}
      onVerInforme={() => {}}
    />,
  );
}

/** Valor de un bloque del encabezado por su etiqueta. */
const bloque = (etiqueta: string | RegExp) => screen.getByText(etiqueta).parentElement!.textContent ?? '';

describe('Rúbrica · tiempos de la simulación', () => {
  it('C35 · muestra fecha, hora, minuto y segundo del momento simulado', () => {
    montarEncabezado();
    expect(bloque('Fecha y hora simulada')).toContain('6 ene 2026 · 02:03:04');
  });

  it('C36 · muestra fecha, hora, minuto y segundo del momento actual (tiempo real)', () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    vi.setSystemTime(new Date(2026, 9, 28, 15, 4, 5));
    try {
      montarEncabezado();
      expect(bloque('Fecha y hora real')).toContain('28 oct 2026 · 15:04:05');
      // Se actualiza cada segundo.
      act(() => vi.advanceTimersByTime(1000));
      expect(bloque('Fecha y hora real')).toContain('28 oct 2026 · 15:04:06');
    } finally {
      vi.useRealTimers();
    }
  });

  it('C36 · en Operación la barra superior muestra la fecha y hora real junto al reloj de la operación', () => {
    render(<TopNavbar tabActiva="operacion" onCambiarTab={() => {}} relojSimulado="28/10/2026 · 15:04:05" />);
    expect(screen.getByRole('group', { name: 'Fecha y hora real' }).textContent).toMatch(/\d{1,2} \w{3} \d{4} · \d{2}:\d{2}:\d{2}/);
  });

  it('C37 · muestra el tiempo transcurrido dentro de lo simulado (días, horas, minutos)', () => {
    montarEncabezado();
    expect(bloque('Tiempo simulado transcurrido')).toContain('1 d 02 h 03 m');
  });

  it('C37 · el tiempo simulado transcurrido incluye los segundos', () => {
    montarEncabezado();
    expect(bloque('Tiempo simulado transcurrido')).toMatch(/04 s/);
  });

  it('C38 · muestra el tiempo real transcurrido (mm:ss / h:mm:ss) y el restante estimado', () => {
    montarEncabezado();
    const texto = bloque('Tiempo real transcurrido / Restante');
    expect(texto).toContain('08:30');
    // Restante: (5 d − simulado) / k = (120 h − 26 h 03 m 04 s) / 180 ≈ 31:19.
    expect(texto).toMatch(/~31:\d{2}/);
  });

  it('C39 · los tiempos están juntos en un bloque fijo sobre el mapa, con el reloj simulado destacado', () => {
    const { container } = montarEncabezado();
    const encabezado = container.querySelector('header')!;
    ['Fecha y hora simulada', 'Tiempo simulado transcurrido', 'Tiempo real transcurrido / Restante'].forEach((etiqueta) =>
      expect(within(encabezado).getByText(etiqueta)).toBeTruthy(),
    );
    // El reloj simulado usa un tamaño mayor que el resto (20 px frente a 12 px).
    const reloj = within(encabezado).getByText(/6 ene 2026/);
    expect(reloj.className).toContain('text-title');
    // Y el avance de la corrida en días.
    expect(screen.getByRole('progressbar', { name: 'Avance de la simulación' }).getAttribute('aria-valuenow')).toBe('22');
  });
});

/** El resumen del mapa con su desplegable abierto, donde está el uso de la flota con su semáforo. */
const resumenMapa = (
  <ResumenMapa ubicacion={{ donde: 'centro', izquierdaPx: 400, anchoPx: 480, metricas: 4 }} abierto onAlternar={() => {}} altoMapaPx={800} altoHojaPx={0} reducida={false} />
);

describe('Rúbrica · nivel de uso de la flota total', () => {
  const datos = datosRubrica();

  it('C40 · el resumen muestra la flota en números y porcentaje (en ruta de total, con su porcentaje)', () => {
    renderConDatos(resumenMapa, datos);
    expect(screen.getByText('Unidades en ruta').parentElement!.parentElement!.textContent).toContain('2 de 4 (50 %)');
  });

  it('C40 · la franja del mapa lleva siempre a la vista las unidades en ruta del total', () => {
    renderConDatos(resumenMapa, datos);
    const franja = within(screen.getByRole('region', { name: 'Resumen de la operación' }));
    expect(franja.getByText('En ruta').nextElementSibling!.textContent).toBe('2 de 4');
  });

  it('C40 · el porcentaje y la marca de la tarjeta siguen las unidades mostradas, no la saturación del servidor', () => {
    renderConDatos(resumenMapa, { ...datos, resumen: { ...datos.resumen, saturacion: 1 } });
    const tarjeta = screen.getByText('Unidades en ruta').parentElement!.parentElement!;
    expect(tarjeta.textContent).toContain('2 de 4 (50 %)');
    expect(within(tarjeta).queryByRole('img')).toBeNull();
  });

  it.each([
    [3, '3 de 4 (75 %)', 'Flota con carga alta'],
    [4, '4 de 4 (100 %)', 'Toda la flota en ruta'],
  ])('C40 · con %i unidades en ruta la tarjeta marca el nivel de carga', (enRuta, texto, marca) => {
    const unidades = datos.flota.map((u, i) => ({ ...u, estado: i < enRuta ? ('EN_RUTA' as const) : ('DISPONIBLE' as const) }));
    renderConDatos(resumenMapa, { ...datos, flota: unidades, resumen: { ...datos.resumen, saturacion: 0 } });
    const tarjeta = screen.getByText('Unidades en ruta').parentElement!.parentElement!;
    expect(tarjeta.textContent).toContain(texto);
    expect(within(tarjeta).getByRole('img', { name: marca })).toBeTruthy();
  });

  it('C40 · sin unidades la tarjeta dice "0 de 0", sin porcentaje ni marca', () => {
    renderConDatos(resumenMapa, { ...datos, flota: [], resumen: { ...datos.resumen, saturacion: 1 } });
    const tarjeta = screen.getByText('Unidades en ruta').parentElement!.parentElement!;
    expect(tarjeta.textContent).toContain('0 de 0');
    expect(tarjeta.textContent).not.toContain('%');
    expect(within(tarjeta).queryByRole('img')).toBeNull();
  });

  it('C40 · exactamente 70 % en ruta ya marca carga alta (7 de 10)', () => {
    const base = datos.flota[0];
    const unidades = Array.from({ length: 10 }, (_, i) => ({ ...base, codigo: `U${i}`, estado: i < 7 ? ('EN_RUTA' as const) : ('DISPONIBLE' as const) }));
    renderConDatos(resumenMapa, { ...datos, flota: unidades, resumen: { ...datos.resumen, saturacion: 0 } });
    const tarjeta = screen.getByText('Unidades en ruta').parentElement!.parentElement!;
    expect(tarjeta.textContent).toContain('7 de 10 (70 %)');
    expect(within(tarjeta).getByRole('img', { name: 'Flota con carga alta' })).toBeTruthy();
  });

  it('C40 · la pestaña Flota muestra el porcentaje en ruta y la carga a bordo por tipo', () => {
    renderConDatos(<EstadoFlota onSeleccionar={() => {}} />, datos);
    expect(screen.getByText(/Estado de la flota · 4 unidades/).parentElement!.textContent).toContain('50 % en ruta');
    expect(screen.getByRole('meter', { name: 'Carga a bordo de auto' }).getAttribute('aria-valuenow')).toBe('83');
    expect(screen.getByRole('meter', { name: 'Carga a bordo de moto' }).getAttribute('aria-valuenow')).toBe('100');
  });

  it('C41 · la carga de la flota usa semáforo: ámbar para autos (83 %) y rojo para motos (100 %)', () => {
    renderConDatos(<EstadoFlota onSeleccionar={() => {}} />, datos);
    const relleno = (nombre: string) => screen.getByRole('meter', { name: nombre }).firstElementChild!.className;
    expect(relleno('Carga a bordo de auto')).toContain('bg-warn-700');
    expect(relleno('Carga a bordo de moto')).toContain('bg-critical-600');
    // La barra segmentada por estado tiene su texto alternativo con las cantidades.
    expect(screen.getByRole('img', { name: /en ruta/ }).getAttribute('aria-label')).toBe('2 en ruta, 1 disponibles, 1 averiadas');
  });
});

describe('Rúbrica · C16 · presentación de los tiempos', () => {
  it('los tiempos van en dos pares, simulado y real, con jerarquía: fecha-hora sobre transcurrido sobre etiqueta', () => {
    montarEncabezado();
    const simulado = within(screen.getByRole('region', { name: 'Simulado' }));
    const real = within(screen.getByRole('region', { name: 'Real' }));
    expect(simulado.getByText('Fecha y hora simulada')).toBeTruthy();
    expect(simulado.getByText('Tiempo simulado transcurrido')).toBeTruthy();
    expect(real.getByText('Fecha y hora real')).toBeTruthy();
    expect(real.getByText('Tiempo real transcurrido / Restante')).toBeTruthy();
    // Etiquetas (caption) < transcurridos (body) < fecha-hora real (title-sm) < fecha-hora simulada (title).
    expect(simulado.getByText('Fecha y hora simulada').className).toContain('text-caption');
    expect(simulado.getByText(/1 d 02 h/).className).toContain('text-body');
    expect(real.getByText(/\d{4} · \d{2}:\d{2}:\d{2}/).className).toContain('text-title-sm');
  });
});
