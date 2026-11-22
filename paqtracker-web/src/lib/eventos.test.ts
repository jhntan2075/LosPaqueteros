import { describe, expect, it } from 'vitest';
import type { MensajeEventoApi } from '../types/api';
import type { EventoBitacora } from '../types/operacion';
import { MAXIMO_ALERTAS, MAXIMO_IMPORTANTES, MAXIMO_RUTINARIOS, agruparActividad, combinarEventos } from './eventos';

const evento = (id: string, ts: number, tipo: MensajeEventoApi['tipo'] = 'NUEVO_PEDIDO'): MensajeEventoApi => ({
  id,
  ejecucionId: 'e1',
  tipo,
  mensaje: id,
  timestampSimuladoMs: ts,
  detalle: {},
});

describe('combinarEventos', () => {
  it('ordena del más reciente al más antiguo', () => {
    const r = combinarEventos([evento('a', 10)], [evento('b', 30), evento('c', 20)]);
    expect(r.map((e) => e.id)).toEqual(['b', 'c', 'a']);
  });

  it('no repite eventos con el mismo id', () => {
    const r = combinarEventos([evento('a', 10)], [evento('a', 10), evento('b', 5)]);
    expect(r.map((e) => e.id)).toEqual(['a', 'b']);
  });

  it('una respuesta REST tardía no pierde los eventos en vivo que llegaron antes', () => {
    const enVivo = [evento('vivo2', 200), evento('vivo1', 100)];
    const historial = [evento('vivo1', 100), evento('h2', 50), evento('h1', 40)];
    expect(combinarEventos(enVivo, historial).map((e) => e.id)).toEqual(['vivo2', 'vivo1', 'h2', 'h1']);
  });

  it('limita los rutinarios a su cupo, conservando los más recientes', () => {
    const muchos = Array.from({ length: MAXIMO_RUTINARIOS + 20 }, (_, i) => evento(`r${i}`, i));
    const r = combinarEventos([], muchos);
    expect(r).toHaveLength(MAXIMO_RUTINARIOS);
    expect(r[0].id).toBe(`r${MAXIMO_RUTINARIOS + 19}`);
  });

  it('limita los importantes a su cupo', () => {
    const muchos = Array.from({ length: MAXIMO_IMPORTANTES + 5 }, (_, i) => evento(`i${i}`, i, 'UNIDAD_AVERIADA'));
    expect(combinarEventos([], muchos)).toHaveLength(MAXIMO_IMPORTANTES);
  });

  it('los rutinarios no desalojan a los importantes', () => {
    const importante = evento('colapso', 1, 'ALERTA_COLAPSO');
    const rutinarios = Array.from({ length: MAXIMO_RUTINARIOS + 50 }, (_, i) => evento(`r${i}`, 100 + i));
    const r = combinarEventos([importante], rutinarios);
    expect(r.some((e) => e.id === 'colapso')).toBe(true);
    expect(r.filter((e) => e.tipo === 'NUEVO_PEDIDO')).toHaveLength(MAXIMO_RUTINARIOS);
  });

  it('STOCK_BAJO y PEDIDO_TARDE tienen su propio cupo: no desalojan a los importantes ni a los rutinarios', () => {
    const importante = evento('colapso', 1, 'ALERTA_COLAPSO');
    const rutinario = evento('pedido', 2);
    const alertas = Array.from({ length: MAXIMO_ALERTAS + 50 }, (_, i) => evento(`a${i}`, 100 + i, i % 2 === 0 ? 'PEDIDO_TARDE' : 'STOCK_BAJO'));
    const r = combinarEventos([importante, rutinario], alertas);
    expect(r.map((e) => e.id)).toEqual(expect.arrayContaining(['colapso', 'pedido']));
    expect(r.filter((e) => e.tipo === 'PEDIDO_TARDE' || e.tipo === 'STOCK_BAJO')).toHaveLength(MAXIMO_ALERTAS);
    expect(r[0].id).toBe(`a${MAXIMO_ALERTAS + 49}`);
  });

  it('los importantes no desalojan a las alertas', () => {
    const importantes = Array.from({ length: MAXIMO_IMPORTANTES + 20 }, (_, i) => evento(`i${i}`, 100 + i, 'UNIDAD_AVERIADA'));
    const r = combinarEventos([evento('tarde', 1, 'PEDIDO_TARDE')], importantes);
    expect(r.some((e) => e.id === 'tarde')).toBe(true);
    expect(r).toHaveLength(MAXIMO_IMPORTANTES + 1);
  });

  it('a igual instante simulado, el entrante (el más nuevo) va primero, como en el servidor', () => {
    const r = combinarEventos([evento('viejo', 10)], [evento('nuevo', 10)]);
    expect(r.map((e) => e.id)).toEqual(['nuevo', 'viejo']);
  });
});

describe('agruparActividad', () => {
  const MIN = 60_000;
  const fila = (id: string, tipo: string, ts: number, color: EventoBitacora['color'] = 'gris'): EventoBitacora => ({
    id,
    tipo,
    instanteMs: ts,
    hora: `h-${id}`,
    titulo: tipo,
    detalle: '',
    categoria: 'OPERACION',
    color,
  });

  it('junta replanificaciones consecutivas con la hora de la última', () => {
    const r = agruparActividad([fila('3', 'PLAN_ACTUALIZADO', 3 * MIN), fila('2', 'PLAN_ACTUALIZADO', 2 * MIN), fila('1', 'PLAN_ACTUALIZADO', MIN)]);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ clase: 'grupo', titulo: '3 replanificaciones · última h-3' });
  });

  it('un grupo de uno es un evento normal', () => {
    expect(agruparActividad([fila('1', 'PLAN_ACTUALIZADO', MIN)])).toEqual([{ clase: 'evento', evento: expect.objectContaining({ id: '1' }) }]);
  });

  it('junta pedidos y entregas solo dentro del mismo minuto simulado', () => {
    const r = agruparActividad([
      fila('4', 'NUEVO_PEDIDO', 5 * MIN + 40_000),
      fila('3', 'NUEVO_PEDIDO', 5 * MIN + 10_000),
      fila('2', 'NUEVO_PEDIDO', 4 * MIN + 50_000),
      fila('e2', 'PEDIDO_ENTREGADO', 3 * MIN + 30_000),
      fila('e1', 'PEDIDO_ENTREGADO', 3 * MIN + 5_000),
    ]);
    expect(r.map((f) => (f.clase === 'grupo' ? f.titulo : f.evento.id))).toEqual(['+2 pedidos registrados', '2', '2 entregas']);
  });

  it('un evento de otro tipo corta el grupo, y una entrega con retraso queda suelta', () => {
    const r = agruparActividad([
      fila('3', 'PLAN_ACTUALIZADO', 3 * MIN),
      fila('x', 'UNIDAD_AVERIADA', 2 * MIN, 'rojo'),
      fila('2', 'PLAN_ACTUALIZADO', 2 * MIN),
      fila('1', 'PLAN_ACTUALIZADO', MIN),
      fila('t', 'PEDIDO_ENTREGADO', MIN, 'rojo'),
    ]);
    expect(r.map((f) => f.clase)).toEqual(['evento', 'evento', 'grupo', 'evento']);
  });
});

describe('agruparActividad · clave de grupo', () => {
  const MIN = 60_000;
  const fila = (id: string, ts: number): EventoBitacora => ({
    id,
    tipo: 'PLAN_ACTUALIZADO',
    instanteMs: ts,
    hora: `h-${id}`,
    titulo: 'plan',
    detalle: '',
    categoria: 'PLANIFICADOR',
    color: 'gris',
  });

  it('la clave del grupo no cambia cuando se suma un evento más nuevo (el grupo abierto no se cierra)', () => {
    const clave = (filas: ReturnType<typeof agruparActividad>) => {
      const f = filas[0];
      if (f.clase !== 'grupo') throw new Error('se esperaba un grupo');
      return f.clave;
    };
    const antes = clave(agruparActividad([fila('2', 2 * MIN), fila('1', MIN)]));
    const despues = clave(agruparActividad([fila('3', 3 * MIN), fila('2', 2 * MIN), fila('1', MIN)]));
    expect(despues).toBe(antes);
  });
});
