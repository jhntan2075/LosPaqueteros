// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { OcupacionGlobal } from '../../lib/operacion';
import { AlertasMapaTarjeta, type AlertasMapa } from './AlertasMapaTarjeta';
import { BuscadorMapa, type BusquedaMapa } from './BuscadorMapa';
import { PilaSuperiorMapa } from './PilaSuperiorMapa';

// La pila de arriba a la izquierda: buscador, tarjeta de alertas y ocupación global.

afterEach(cleanup);

const ALERTAS: AlertasMapa = { riesgo: { rojo: 5, ambar: 16, tarde: 3 }, bloqueos: 1, averias: 0 };

describe('AlertasMapaTarjeta', () => {
  it('resume lo que llegará tarde y, debajo, el riesgo, los bloqueos y las averías', () => {
    render(<AlertasMapaTarjeta alertas={ALERTAS} soloRiesgo={false} onAbrir={() => {}} />);
    const tarjeta = within(screen.getByRole('region', { name: 'Alertas' }));
    expect(tarjeta.getByRole('button', { name: '3 llegarán tarde. Ver Incidencias' })).toBeTruthy();
    expect(tarjeta.getByText('21 en riesgo')).toBeTruthy();
    expect(tarjeta.getByText('1 bloqueo')).toBeTruthy();
    expect(tarjeta.getByText('0 averías')).toBeTruthy();
  });

  it('sin pedidos que lleguen tarde, el titular es el riesgo; sin riesgo, que todo va en plazo', () => {
    const { rerender } = render(<AlertasMapaTarjeta alertas={{ ...ALERTAS, riesgo: { rojo: 2, ambar: 1, tarde: 0 } }} soloRiesgo={false} onAbrir={() => {}} />);
    expect(screen.getByRole('button', { name: '3 en riesgo. Ver Incidencias' })).toBeTruthy();
    rerender(<AlertasMapaTarjeta alertas={{ riesgo: { rojo: 0, ambar: 0 }, bloqueos: 0, averias: 0 }} soloRiesgo={false} onAbrir={() => {}} />);
    expect(screen.getByRole('button', { name: 'Todo va en plazo. Ver Incidencias' })).toBeTruthy();
    rerender(<AlertasMapaTarjeta alertas={{ ...ALERTAS, riesgo: { rojo: 1, ambar: 0, tarde: 1 } }} soloRiesgo={false} onAbrir={() => {}} />);
    expect(screen.getByRole('button', { name: '1 llegará tarde. Ver Incidencias' })).toBeTruthy();
  });

  it('con averías o bloqueos nunca dice que todo va en plazo, aunque no haya pedidos en riesgo', () => {
    const sinRiesgo = { rojo: 0, ambar: 0, tarde: 0 };
    const { rerender } = render(<AlertasMapaTarjeta alertas={{ riesgo: sinRiesgo, bloqueos: 0, averias: 1 }} soloRiesgo={false} onAbrir={() => {}} />);
    expect(screen.getByRole('button', { name: 'Sin pedidos en riesgo. Ver Incidencias' })).toBeTruthy();
    rerender(<AlertasMapaTarjeta alertas={{ riesgo: sinRiesgo, bloqueos: 2, averias: 0 }} soloRiesgo={false} onAbrir={() => {}} />);
    expect(screen.getByRole('button', { name: 'Sin pedidos en riesgo. Ver Incidencias' })).toBeTruthy();
    // En Simulación no se cuentan averías ni bloqueos: sin riesgo, todo va en plazo.
    rerender(<AlertasMapaTarjeta alertas={{ riesgo: sinRiesgo, bloqueos: 2, averias: 1 }} soloRiesgo onAbrir={() => {}} />);
    expect(screen.getByRole('button', { name: 'Todo va en plazo. Ver Incidencias' })).toBeTruthy();
  });

  it('el titular abre Incidencias y cada cifra abre su sección', () => {
    const onAbrir = vi.fn();
    render(<AlertasMapaTarjeta alertas={{ ...ALERTAS, averias: 2 }} soloRiesgo={false} onAbrir={onAbrir} />);
    fireEvent.click(screen.getByRole('button', { name: /^3 llegarán tarde/ }));
    expect(onAbrir).toHaveBeenLastCalledWith();
    fireEvent.click(screen.getByRole('button', { name: /^21 pedidos en riesgo: 5 críticos y 16 ajustados\. Ver en Incidencias/ }));
    expect(onAbrir).toHaveBeenLastCalledWith('riesgo');
    fireEvent.click(screen.getByRole('button', { name: '1 bloqueo. Ver en Incidencias' }));
    expect(onAbrir).toHaveBeenLastCalledWith('bloqueos');
    fireEvent.click(screen.getByRole('button', { name: '2 averías. Ver en Incidencias' }));
    expect(onAbrir).toHaveBeenLastCalledWith('averias');
  });

  it('en Simulación solo se alerta del riesgo', () => {
    render(<AlertasMapaTarjeta alertas={ALERTAS} soloRiesgo onAbrir={() => {}} />);
    expect(screen.getByText('21 en riesgo')).toBeTruthy();
    expect(screen.queryByText(/bloqueo/)).toBeNull();
    expect(screen.queryByText(/avería/)).toBeNull();
  });

  it('todos sus botones miden al menos 44 px de alto', () => {
    render(<AlertasMapaTarjeta alertas={ALERTAS} soloRiesgo={false} onAbrir={() => {}} />);
    screen.getAllByRole('button').forEach((b) => expect(b.className).toContain('min-h-11'));
  });
});

const BUSQUEDA: BusquedaMapa = { termino: '', onCambiar: () => {}, sinResultados: false, onBuscar: (e) => e.preventDefault(), opciones: ['#1001', 'A-01'] };

describe('BuscadorMapa', () => {
  it('es una tarjeta con la entrada de búsqueda de siempre, y avisa cuando no hay resultados', () => {
    const { rerender } = render(<BuscadorMapa busqueda={BUSQUEDA} plegable={false} />);
    expect(screen.getByRole('search')).toBeTruthy();
    expect(screen.getByLabelText('Buscar pedido o unidad en el mapa')).toBeTruthy();
    rerender(<BuscadorMapa busqueda={{ ...BUSQUEDA, termino: 'zzz', sinResultados: true }} plegable={false} />);
    expect(screen.getByRole('status').textContent).toBe('No hay pedidos, unidades ni almacenes en el mapa con «zzz»');
  });

  it('plegable: es un botón de ícono de 44 px que, al tocarlo, despliega la entrada con el foco', () => {
    render(<BuscadorMapa busqueda={BUSQUEDA} plegable />);
    expect(screen.queryByRole('search')).toBeNull();
    const boton = screen.getByRole('button', { name: 'Buscar pedido o unidad en el mapa' });
    expect(boton.className).toContain('size-11');
    fireEvent.click(boton);
    expect(document.activeElement).toBe(screen.getByLabelText('Buscar pedido o unidad en el mapa'));
    // Sin texto, al salir de la entrada vuelve a plegarse.
    fireEvent.blur(screen.getByLabelText('Buscar pedido o unidad en el mapa'));
    expect(screen.queryByRole('search')).toBeNull();
  });

  it('plegable: con texto escrito no se pliega al salir de la entrada', () => {
    render(<BuscadorMapa busqueda={{ ...BUSQUEDA, termino: 'A-01' }} plegable />);
    fireEvent.click(screen.getByRole('button', { name: 'Buscar pedido o unidad en el mapa' }));
    fireEvent.blur(screen.getByLabelText('Buscar pedido o unidad en el mapa'));
    expect(screen.getByRole('search')).toBeTruthy();
  });
});

describe('PilaSuperiorMapa', () => {
  const ocupacion = (cantidad: number, capacidad: number): OcupacionGlobal => ({ cantidad, capacidad, fraccion: cantidad / capacidad, nivel: 'AMBAR' });

  it('reúne buscador, alertas y ocupación global, y los botones de la ocupación abren Flota y Almacenes', () => {
    const onAbrirFlota = vi.fn();
    const onAbrirAlmacenes = vi.fn();
    render(
      <PilaSuperiorMapa
        busqueda={BUSQUEDA}
        alertas={ALERTAS}
        soloRiesgo={false}
        onAbrirIncidencias={() => {}}
        ocupacion={{ flota: ocupacion(28, 36), almacenes: ocupacion(50, 200), onAbrirFlota, onAbrirAlmacenes }}
        compacto={false}
        reducida={false}
      />,
    );
    expect(screen.getByRole('search')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Ver detalle' })).toBeNull();
    expect(screen.getByRole('region', { name: 'Alertas' })).toBeTruthy();
    const global = within(screen.getByRole('region', { name: 'Ocupación global' }));
    fireEvent.click(global.getByRole('button', { name: /^Carga de flota: 78 %/ }));
    fireEvent.click(global.getByRole('button', { name: /^Stock de almacenes: 25 %/ }));
    expect(onAbrirFlota).toHaveBeenCalledTimes(1);
    expect(onAbrirAlmacenes).toHaveBeenCalledTimes(1);
    global.getAllByRole('button').forEach((b) => expect(b.className).toContain('min-h-11'));
  });

  it('el contenedor de la pila no captura toques: solo sus tarjetas, y el espacio libre a su lado mueve el mapa', () => {
    const { container } = render(
      <PilaSuperiorMapa
        busqueda={BUSQUEDA}
        alertas={ALERTAS}
        soloRiesgo={false}
        onAbrirIncidencias={() => {}}
        ocupacion={{ flota: ocupacion(28, 36), almacenes: ocupacion(50, 200) }}
        compacto={false}
        reducida={false}
      />,
    );
    const pila = container.firstElementChild as HTMLElement;
    expect(pila.className).toContain('pointer-events-none');
    expect(pila.className).toContain('[&>*]:pointer-events-auto');
    // Cada tarjeta se excluye del arrastre y el zoom del mapa.
    Array.from(pila.children).forEach((tarjeta) => expect(tarjeta.hasAttribute('data-sin-zoom')).toBe(true));
  });

  it('sin resultados el aviso no deja un hueco bajo el buscador mientras no hay mensaje', () => {
    render(<BuscadorMapa busqueda={BUSQUEDA} plegable={false} />);
    expect(screen.getByRole('status').textContent).toBe('');
    expect(screen.getByRole('search').parentElement!.className).not.toContain('gap-');
  });

  describe('reducida (celular o mapa de poca altura)', () => {
    const montarReducida = (onAbrirIncidencias = vi.fn(), compacto = false) =>
      render(
        <PilaSuperiorMapa
          busqueda={BUSQUEDA}
          alertas={ALERTAS}
          soloRiesgo={false}
          onAbrirIncidencias={onAbrirIncidencias}
          ocupacion={{ flota: ocupacion(28, 36), almacenes: ocupacion(50, 200) }}
          compacto={compacto}
          reducida
        />,
      );

    it('muestra solo el buscador y una fila de alertas; el detalle queda tras "Ver detalle"', () => {
      montarReducida();
      expect(screen.getByRole('search')).toBeTruthy();
      expect(screen.getByRole('button', { name: /^3 llegarán tarde/ })).toBeTruthy();
      expect(screen.queryByText('21 en riesgo')).toBeNull();
      expect(screen.queryByRole('region', { name: 'Ocupación global' })).toBeNull();
      const detalle = screen.getByRole('button', { name: 'Ver detalle' });
      expect(detalle.getAttribute('aria-expanded')).toBe('false');
      expect(detalle.className).toContain('size-11');
    });

    it('"Ver detalle" despliega las cifras de alertas y la ocupación global, y vuelve a plegarlos', () => {
      montarReducida();
      const detalle = screen.getByRole('button', { name: 'Ver detalle' });
      fireEvent.click(detalle);
      expect(detalle.getAttribute('aria-expanded')).toBe('true');
      expect(detalle.getAttribute('aria-controls')).toBe(screen.getByText('21 en riesgo').closest('div')!.id);
      expect(screen.getByText('1 bloqueo')).toBeTruthy();
      expect(screen.getByRole('region', { name: 'Ocupación global' })).toBeTruthy();
      fireEvent.click(detalle);
      expect(detalle.getAttribute('aria-expanded')).toBe('false');
      expect(screen.queryByText('21 en riesgo')).toBeNull();
      expect(screen.queryByRole('region', { name: 'Ocupación global' })).toBeNull();
    });

    it('el titular sigue abriendo Incidencias', () => {
      const onAbrir = vi.fn();
      montarReducida(onAbrir);
      fireEvent.click(screen.getByRole('button', { name: /^3 llegarán tarde/ }));
      expect(onAbrir).toHaveBeenCalledWith();
    });

    it('el buscador solo se pliega a un ícono en compacto, no por tener poca altura', () => {
      montarReducida();
      expect(screen.getByRole('search')).toBeTruthy();
      cleanup();
      montarReducida(vi.fn(), true);
      expect(screen.queryByRole('search')).toBeNull();
    });
  });
});
