// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GridMap } from '../../components/map/GridMap';
import { COLOR_CARGA, colorDeUnidad } from '../../components/map/iconosVehiculo';
import { LeyendaMapa } from '../../components/map/LeyendaMapa';
import { clienteApi } from '../../services/clienteApi';
import { construirDatosOperacion } from '../../services/adaptadorOperacion';
import { INICIO_MS, mensajeEstado } from '../fabricas';
import {
  ANCHO_MAPA,
  MIN,
  contrasteSobreBlanco,
  datosRubrica,
  mensajeRubrica,
  objetoMapa,
  posicionEnPantalla,
  prepararEntornoMapa,
} from './escenario';
import { montarOperacion, renderConDatos } from './montaje';

// Rúbrica c.1inf54.26-2 · "Criterios generales antes de los escenarios" · bloque MAPA (criterios 2–36
// marcados "Sí"). Cada `it` lleva el número del criterio. Las brechas encontradas se escriben con
// `it.fails`: documentan lo que la rúbrica pide y el producto aún no hace; si alguien lo implementa, la
// prueba empieza a "fallar al no fallar" y avisa que hay que pasarla a `it`.

beforeEach(() => {
  prepararEntornoMapa();
  vi.spyOn(clienteApi, 'detallePedido').mockResolvedValue({ hitos: [] } as never);
  vi.spyOn(clienteApi, 'estimarAverias').mockResolvedValue([]);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const pasarMouse = (elemento: Element) => fireEvent.pointerMove(elemento, { clientX: 10, clientY: 10 });
const tooltip = () => screen.getByRole('tooltip').textContent ?? '';

describe('Rúbrica · MAPA · pantalla principal', () => {
  it('C2 · el mapa (malla completa 70 × 50 km) es la pantalla principal de Operación', () => {
    const { container } = montarOperacion();
    const svg = container.querySelector('svg.absolute');
    expect(svg).toBeTruthy();
    // Los rótulos de los ejes llegan a los bordes de la malla: 0k–70k en x y 0k–50k en y.
    const rotulos = Array.from(svg!.querySelectorAll('text')).map((t) => t.textContent);
    expect(rotulos).toContain('70k');
    expect(rotulos).toContain('50k');
    // Los tres almacenes se ven en la vista inicial.
    ['CENTRAL', 'INTERMEDIO_1', 'INTERMEDIO_2'].forEach((id) => expect(objetoMapa(container, `almacen:${id}`)).toBeTruthy());
  });

  it('C3 · el mapa ocupa todo su contenedor y la malla se encuadra al tamaño disponible', () => {
    const { container } = montarOperacion();
    const mapa = container.querySelector('.cursor-grab') as HTMLElement;
    expect(mapa.className).toContain('w-full');
    expect(mapa.className).toContain('h-full');
    // Entre el almacén más a la izquierda (x=12) y el más a la derecha (x=57) hay 45 km: con la malla
    // encuadrada en 1200 px de ancho, esa distancia ocupa más de la mitad del lienzo.
    const izq = posicionEnPantalla(objetoMapa(container, 'almacen:INTERMEDIO_1')!);
    const der = posicionEnPantalla(objetoMapa(container, 'almacen:INTERMEDIO_2')!);
    expect(der.x - izq.x).toBeGreaterThan(ANCHO_MAPA / 2);
  });

  it('C4 · al inicio el mapa está libre: panel lateral, leyenda, capas y métricas cerrados', () => {
    localStorage.clear();
    montarOperacion();
    expect(screen.queryByRole('complementary', { name: 'Incidencias, flota y bitácora' })).toBeNull();
    expect(screen.queryByRole('region', { name: 'Leyenda del mapa' })).toBeNull();
    expect(screen.queryByRole('group', { name: 'Capas visibles' })).toBeNull();
    expect(screen.queryByRole('dialog', { name: 'Panel de métricas operativas' })).toBeNull();
    // Se abren a demanda desde los accesos flotantes.
    fireEvent.click(screen.getByRole('button', { name: 'Flota' }));
    expect(screen.getByRole('complementary', { name: 'Incidencias, flota y bitácora' })).toBeTruthy();
  });
});

describe('Rúbrica · MAPA · almacén principal', () => {
  it('C5 · el almacén central se dibuja en su nodo (27,14), con la misma escala en x e y que los demás', () => {
    const { container } = montarOperacion();
    const c = posicionEnPantalla(objetoMapa(container, 'almacen:CENTRAL')!);
    const i1 = posicionEnPantalla(objetoMapa(container, 'almacen:INTERMEDIO_1')!);
    const i2 = posicionEnPantalla(objetoMapa(container, 'almacen:INTERMEDIO_2')!);
    // Proyección lineal y sin deformar: px/km igual en ambos ejes y entre todos los pares.
    const escalaX = (i2.x - c.x) / (57 - 27);
    const escalaY = (i1.y - c.y) / (38 - 14);
    expect(escalaX).toBeGreaterThan(0);
    expect(escalaY).toBeCloseTo(escalaX, 6);
    expect((c.x - i1.x) / (27 - 12)).toBeCloseTo(escalaX, 6);
    expect((i2.y - c.y) / (27 - 14)).toBeCloseTo(escalaX, 6);
  });

  it('C6 · el central tiene un ícono propio (relleno oscuro) que contrasta con el fondo blanco', () => {
    const { container } = montarOperacion();
    const icono = objetoMapa(container, 'almacen:CENTRAL')!.querySelector('path')!;
    const relleno = icono.getAttribute('fill')!;
    expect(relleno).toBe('#0F172A');
    expect(contrasteSobreBlanco(relleno)).toBeGreaterThanOrEqual(3);
    // Distinto del intermedio (contorno sin relleno).
    expect(objetoMapa(container, 'almacen:INTERMEDIO_1')!.querySelector('path')!.getAttribute('fill')).toBe('#FFFFFF');
  });

  it('C9 · el almacén central muestra los pedidos planificados que salen de él (al abrirlo, vía sus unidades)', () => {
    const { container } = montarOperacion();
    const central = objetoMapa(container, 'almacen:CENTRAL')!;
    fireEvent.pointerDown(central, { button: 0, clientX: 50, clientY: 50, pointerId: 1 });
    fireEvent.pointerUp(central, { button: 0, clientX: 50, clientY: 50, pointerId: 1 });
    // El detalle lista las unidades que salieron con su número de paradas; cada una abre sus pedidos.
    fireEvent.click(screen.getByRole('button', { name: /Auto A-01/ }));
    expect(screen.getByRole('button', { name: /#1001/ })).toBeTruthy();
  });

  it('C9 · al pasar el mouse por el central se listan los pedidos que salen', () => {
    const { container } = montarOperacion();
    pasarMouse(objetoMapa(container, 'almacen:CENTRAL')!);
    expect(tooltip()).toContain('#1001');
  });

  it('C10 · el almacén central lista las unidades que salieron de él', () => {
    const { container } = montarOperacion();
    const central = objetoMapa(container, 'almacen:CENTRAL')!;
    fireEvent.pointerDown(central, { button: 0, clientX: 50, clientY: 50, pointerId: 1 });
    fireEvent.pointerUp(central, { button: 0, clientX: 50, clientY: 50, pointerId: 1 });
    expect(screen.getByText('Unidades que salieron de aquí')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Auto A-01.*20\/24 · 1 parada/ })).toBeTruthy();
    // M-01 salió del Intermedio 2: no aparece en el central.
    expect(screen.queryByRole('button', { name: /Moto M-01/ })).toBeNull();
  });
});

describe('Rúbrica · MAPA · almacenes intermedios', () => {
  it('C12 · cada intermedio está en su nodo y etiquetado con su nombre', () => {
    const { container } = montarOperacion();
    const i1 = objetoMapa(container, 'almacen:INTERMEDIO_1')!;
    const i2 = objetoMapa(container, 'almacen:INTERMEDIO_2')!;
    expect(i1.textContent).toContain('Interm. 1');
    expect(i2.textContent).toContain('Interm. 2');
  });

  it('C13 · el ícono del intermedio contrasta con el mapa (contorno con el color de su semáforo)', () => {
    const { container } = montarOperacion();
    const contorno = objetoMapa(container, 'almacen:INTERMEDIO_2')!.querySelector('path')!.getAttribute('stroke')!;
    expect(contrasteSobreBlanco(contorno)).toBeGreaterThanOrEqual(3);
  });

  it('C14 · el stock del intermedio se ve en porcentaje en el mapa y al pasar el mouse', () => {
    const { container } = montarOperacion();
    const i1 = objetoMapa(container, 'almacen:INTERMEDIO_1')!;
    expect(i1.textContent).toContain('40 %');
    pasarMouse(i1);
    expect(tooltip()).toContain('Stock 40 %');
  });

  it('C15 · el stock del intermedio usa semáforo: ámbar (40 %) y rojo (10 %)', () => {
    const { container } = montarOperacion();
    const color = (id: string) => objetoMapa(container, `almacen:${id}`)!.querySelector('path')!.getAttribute('stroke');
    expect(color('INTERMEDIO_1')).toBe('#B45309');
    expect(color('INTERMEDIO_2')).toBe('#B91C1C');
    // La barra interior es proporcional al stock.
    const barra = (id: string) => Number(objetoMapa(container, `almacen:${id}`)!.querySelectorAll('rect')[1].getAttribute('height'));
    expect(barra('INTERMEDIO_1')).toBeCloseTo(12 * 0.4);
    expect(barra('INTERMEDIO_2')).toBeCloseTo(12 * 0.1);
  });

  it('C16 · el intermedio presenta la lista de pedidos que arriban (o salen) al pasar el mouse', () => {
    const { container } = montarOperacion();
    pasarMouse(objetoMapa(container, 'almacen:INTERMEDIO_2')!);
    expect(tooltip()).toContain('#1002');
  });

  it('C16 · el detalle del intermedio lista las unidades que salieron de él con su carga y paradas', () => {
    const { container } = montarOperacion();
    const i2 = objetoMapa(container, 'almacen:INTERMEDIO_2')!;
    fireEvent.pointerDown(i2, { button: 0, clientX: 50, clientY: 50, pointerId: 1 });
    fireEvent.pointerUp(i2, { button: 0, clientX: 50, clientY: 50, pointerId: 1 });
    expect(screen.getByRole('button', { name: /Moto M-01.*8\/8 · 1 parada/ })).toBeTruthy();
  });
});

describe('Rúbrica · MAPA · unidades de transporte', () => {
  it('C23 · cada unidad se dibuja en su nodo: M-01 en (57,27) coincide con el Intermedio 2', () => {
    const { container } = montarOperacion();
    expect(posicionEnPantalla(objetoMapa(container, 'vehiculo:M-01')!)).toEqual(posicionEnPantalla(objetoMapa(container, 'almacen:INTERMEDIO_2')!));
    // Las que están en el almacén no se dibujan; las que están fuera, sí.
    expect(objetoMapa(container, 'vehiculo:A-02')).toBeNull();
    expect(objetoMapa(container, 'vehiculo:B-01')).toBeTruthy();
  });

  it('C24 · los íconos de unidad usan colores con contraste ≥ 3:1 sobre el mapa (WCAG 1.4.11)', () => {
    Object.values(COLOR_CARGA)
      .filter((c) => c !== COLOR_CARGA.CERRADO)
      .forEach((color) => expect(contrasteSobreBlanco(color)).toBeGreaterThanOrEqual(3));
    const { container } = montarOperacion();
    // Cada tipo tiene su propia silueta (auto, moto, bici) como imagen SVG.
    const href = (codigo: string) => objetoMapa(container, `vehiculo:${codigo}`)!.querySelector('image')!.getAttribute('href')!;
    expect(new Set([href('A-01'), href('M-01'), href('B-01')]).size).toBe(3);
  });

  it('C25 · la unidad en movimiento queda sobre la línea del tramo que recorre', () => {
    const datos = datosRubrica();
    const a01 = datos.flota.find((u) => u.codigo === 'A-01')!;
    // Tramo vertical x = 27 de y = 14 a y = 24: a mitad de camino está en (27, 19).
    expect(a01.posicion).toEqual({ x: 27, y: 19 });
    const { container } = montarOperacion({ datos });
    const unidad = posicionEnPantalla(objetoMapa(container, 'vehiculo:A-01')!);
    const central = posicionEnPantalla(objetoMapa(container, 'almacen:CENTRAL')!);
    expect(unidad.x).toBeCloseTo(central.x, 6); // misma columna x = 27 que el tramo
  });

  it('C26 · el desplazamiento es coherente con la velocidad: avanza en proporción al tiempo del tramo', () => {
    const posicionEn = (ms: number) => construirDatosOperacion(mensajeEstado(mensajeRubrica({ relojSimuladoMs: ms })), ms, []).flota[0].posicion;
    expect(posicionEn(INICIO_MS)).toEqual({ x: 27, y: 14 });
    expect(posicionEn(INICIO_MS + 15 * MIN)).toEqual({ x: 27, y: 16.5 });
    expect(posicionEn(INICIO_MS + 45 * MIN)).toEqual({ x: 27, y: 21.5 });
    expect(posicionEn(INICIO_MS + 60 * MIN)).toEqual({ x: 27, y: 24 });
  });

  it('C26 · el ícono indica la dirección del desplazamiento (rotación o espejo según el sentido)', () => {
    const { container } = montarOperacion();
    const imagen = objetoMapa(container, 'vehiculo:A-01')!.querySelector('image')!;
    // A-01 va hacia el sur: el ícono, que mira al este, se gira 90°.
    expect(imagen.getAttribute('transform') ?? '').toBe('rotate(90)');
  });

  it('C27 · el movimiento es fluido: entre cuadros de 100 ms no hay saltos ni retrocesos', () => {
    // El cliente interpola con el factor k = 180 cada 100 ms reales → 18 s simulados por cuadro.
    const cuadroMs = 100 * 180;
    let anterior = construirDatosOperacion(mensajeEstado(mensajeRubrica()), INICIO_MS, []).flota[0].posicion;
    const pasoEsperadoKm = (10 / (60 * MIN)) * cuadroMs; // 10 km en 60 min
    for (let t = INICIO_MS + cuadroMs; t <= INICIO_MS + 60 * MIN; t += cuadroMs) {
      const actual = construirDatosOperacion(mensajeEstado(mensajeRubrica()), t, []).flota[0].posicion;
      const paso = Math.abs(actual.x - anterior.x) + Math.abs(actual.y - anterior.y);
      expect(actual.y).toBeGreaterThanOrEqual(anterior.y); // no retrocede
      expect(paso).toBeLessThanOrEqual(pasoEsperadoKm * 1.0001); // no salta
      anterior = actual;
    }
  });

  it('C28 · la carga de la unidad se ve en números en el mapa y en porcentaje al pasar el mouse', () => {
    const { container } = montarOperacion();
    const a01 = objetoMapa(container, 'vehiculo:A-01')!;
    expect(a01.textContent).toContain('20/24');
    pasarMouse(a01);
    expect(tooltip()).toContain('Carga 20/24 · 83 %');
  });

  it('C29 · la carga de la unidad usa semáforo: verde < 70 %, ámbar ≥ 70 %, rojo ≥ 90 %, y rojo si está averiada', () => {
    const color = (carga: number, estado: 'EN_RUTA' | 'AVERIADA' = 'EN_RUTA') => colorDeUnidad({ carga, capacidad: 10, estado });
    expect(color(6)).toBe(COLOR_CARGA.VERDE);
    expect(color(7)).toBe(COLOR_CARGA.AMBAR);
    expect(color(9)).toBe(COLOR_CARGA.ROJO);
    expect(color(0, 'AVERIADA')).toBe('#B91C1C');
    // En el mapa, la barra de carga de A-01 (83 %) es ámbar y la de M-01 (100 %) roja.
    const { container } = montarOperacion();
    const barra = (codigo: string) => objetoMapa(container, `vehiculo:${codigo}`)!.querySelectorAll('rect')[1].getAttribute('fill');
    expect(barra('A-01')).toBe(COLOR_CARGA.AMBAR);
    expect(barra('M-01')).toBe(COLOR_CARGA.ROJO);
  });
});

describe('Rúbrica · MAPA · línea de la ruta', () => {
  const rutas = (container: HTMLElement) => Array.from(container.querySelectorAll('path[stroke-dasharray]'));

  it('C30 · se dibuja la línea de la ruta de cada unidad en ruta', () => {
    const { container } = montarOperacion();
    expect(rutas(container).length).toBe(2); // A-01 y M-01 (B-01 está averiada)
  });

  it('C31 · la línea tiene un grosor idóneo (2–4 px), más gruesa si la unidad está seleccionada', () => {
    const { container } = montarOperacion();
    rutas(container).forEach((ruta) => {
      const grosor = Number(ruta.getAttribute('stroke-width'));
      expect(grosor).toBeGreaterThanOrEqual(2);
      expect(grosor).toBeLessThanOrEqual(4);
    });
    const a01 = objetoMapa(container, 'vehiculo:A-01')!;
    fireEvent.pointerDown(a01, { button: 0, clientX: 50, clientY: 50, pointerId: 1 });
    fireEvent.pointerUp(a01, { button: 0, clientX: 50, clientY: 50, pointerId: 1 });
    const destacada = rutas(container).find((r) => r.getAttribute('stroke') === '#1E40AF');
    expect(Number(destacada?.getAttribute('stroke-width'))).toBe(3);
  });

  it('C32 · los colores de la ruta tienen leyenda (tramo recorrido y pendiente con el mismo trazo que el mapa)', () => {
    render(<LeyendaMapa onCerrar={() => {}} />);
    const leyenda = screen.getByRole('region', { name: 'Leyenda del mapa' });
    expect(leyenda.textContent).toContain('Tramo recorrido');
    expect(leyenda.textContent).toContain('Tramo pendiente');
    const pendiente = leyenda.querySelector('line[stroke-dasharray]')!;
    expect(pendiente.getAttribute('stroke')).toBe('#94A3B8');
    expect(pendiente.getAttribute('stroke-dasharray')).toBe('6 4');
  });

  it('C34 · la ruta del tramo actual empieza en la unidad: lo ya recorrido se borra', () => {
    const datos = datosRubrica();
    const a01 = datos.flota.find((u) => u.codigo === 'A-01')!;
    // Ruta pendiente: posición actual → destino del tramo → tramos posteriores. El origen (27,14) ya no está.
    expect(a01.ruta).toEqual([
      { x: 27, y: 19 },
      { x: 27, y: 24 },
      { x: 40, y: 24 },
    ]);
    const { container } = montarOperacion({ datos });
    const unidad = posicionEnPantalla(objetoMapa(container, 'vehiculo:A-01')!);
    const ruta = rutas(container).find((r) => (r.getAttribute('d') ?? '').startsWith(`M ${unidad.x} ${unidad.y}`));
    expect(ruta, 'la ruta de A-01 debe empezar en la posición de la unidad').toBeTruthy();
    // El trazo sólido de lo recorrido queda de longitud cero: todos sus puntos son la posición actual.
    container.querySelectorAll('path[stroke="#9EABBA"]').forEach((recorrido) => {
      const puntos = (recorrido.getAttribute('d') ?? '').split(/[ML]/).map((p) => p.trim()).filter(Boolean);
      expect(new Set(puntos).size).toBe(1);
    });
  });
});

describe('Rúbrica · MAPA · GridMap aislado', () => {
  it('C2 · sin unidades ni pedidos el mapa sigue mostrando la malla y los almacenes', () => {
    const { container } = renderConDatos(<GridMap unidades={[]} destinos={[]} bloqueos={[]} seleccion={null} riesgo={{ rojo: 0, ambar: 0 }} onSeleccionar={() => {}} onAbrirIncidencias={() => {}} />, datosRubrica({ unidades: [], pedidos: [] }));
    expect(objetoMapa(container, 'almacen:CENTRAL')).toBeTruthy();
    expect(objetoMapa(container, 'almacen:INTERMEDIO_1')).toBeTruthy();
  });
});
