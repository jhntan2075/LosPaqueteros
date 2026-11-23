// @vitest-environment jsdom
import { useState } from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SIN_FILTROS, type FiltrosMapa as Filtros } from '../../lib/filtrosMapa';
import type { Capa, ModoColor } from './capas';
import type { ConteosFiltros } from './FiltrosMapa';
import { HerramientasMapa } from './HerramientasMapa';

// Barra de herramientas sobre el mapa: Capas, Filtros y Leyenda abren un popover (uno a la vez); Ver todo y
// Modo enfoque actúan directo. Se prueba sola: el mapa solo le da el estado y los callbacks.

afterEach(cleanup);

const CONTEOS: ConteosFiltros = {
  tipos: { AUTO: 2, MOTO: 1, BICICLETA: 1 },
  carga: { VACIO: 1, VERDE: 1, AMBAR: 1, ROJO: 1 },
  stock: { VACIO: 0, VERDE: 1, AMBAR: 1, ROJO: 0 },
  unidades: { visibles: 4, total: 4 },
  almacenes: { visibles: 3, total: 3 },
};

interface Montaje {
  filtros?: Filtros;
  enfoque?: boolean;
  angosto?: boolean;
  onVerTodo?: () => void;
  onAlternarEnfoque?: () => void;
  onCambiarCapa?: (capa: Capa) => void;
}

/** La barra con su estado de filtros, capas y color como los lleva el mapa. */
function montar({ filtros = SIN_FILTROS, enfoque = false, angosto = false, onVerTodo = () => {}, onAlternarEnfoque = () => {}, onCambiarCapa }: Montaje = {}) {
  const Envoltura = () => {
    const [valor, setValor] = useState<Filtros>(filtros);
    const [modo, setModo] = useState<ModoColor>('carga');
    const [capas, setCapas] = useState<Record<Capa, boolean>>({ rutas: true, unidades: true, destinos: true, bloqueos: true, almacenes: true });
    return (
      <div>
        <button type="button">fuera del mapa</button>
        <HerramientasMapa
          capas={capas}
          onCambiarCapa={(c) => {
            onCambiarCapa?.(c);
            setCapas({ ...capas, [c]: !capas[c] });
          }}
          modoColor={modo}
          onCambiarModoColor={setModo}
          filtros={{ valor, conteos: CONTEOS, activos: valor.tipos.length + valor.carga.length + valor.stock.length, onCambiar: setValor }}
          onVerTodo={onVerTodo}
          enfoque={enfoque}
          onAlternarEnfoque={onAlternarEnfoque}
          derechaPx={12}
          inferiorPx={0}
          angosto={angosto}
        />
      </div>
    );
  };
  return render(<Envoltura />);
}

const boton = (nombre: string | RegExp) => screen.getByRole('button', { name: nombre });

describe('HerramientasMapa', () => {
  it('es una barra vertical con los cinco botones: Capas, Filtros, Leyenda, Ver todo y Modo enfoque', () => {
    montar();
    const barra = screen.getByRole('toolbar', { name: 'Herramientas del mapa' });
    expect(barra.getAttribute('aria-orientation')).toBe('vertical');
    const botones = within(barra).getAllByRole('button');
    expect(botones.map((b) => b.getAttribute('aria-label'))).toEqual(['Capas', 'Filtros', 'Leyenda', 'Ver la malla completa', 'Modo enfoque']);
    // Todos con el lado de un objetivo táctil (44 px = size-11).
    botones.forEach((b) => expect(b.className).toContain('size-11'));
    expect(within(barra).getByRole('separator')).toBeTruthy();
  });

  it('Capas, Filtros y Leyenda abren un popover cada uno, de a uno, con su botón expandido y enlazado', () => {
    montar();
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(boton('Capas'));
    const capas = screen.getByRole('dialog', { name: 'Capas del mapa' });
    expect(boton('Capas').getAttribute('aria-expanded')).toBe('true');
    expect(boton('Capas').getAttribute('aria-controls')).toBe(capas.id);

    fireEvent.click(boton('Filtros'));
    expect(screen.queryByRole('dialog', { name: 'Capas del mapa' })).toBeNull();
    expect(screen.getByRole('dialog', { name: 'Filtros del mapa' })).toBeTruthy();
    expect(boton('Capas').getAttribute('aria-expanded')).toBe('false');
    expect(boton('Filtros').getAttribute('aria-expanded')).toBe('true');

    fireEvent.click(boton('Leyenda'));
    expect(screen.queryByRole('dialog', { name: 'Filtros del mapa' })).toBeNull();
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(within(screen.getByRole('dialog', { name: 'Leyenda' })).getByRole('table', { name: 'Semáforo de carga y stock' })).toBeTruthy();
    expect(within(screen.getByRole('dialog', { name: 'Leyenda' })).getByRole('button', { name: 'Configurar rangos' })).toBeTruthy();
  });

  it('tocar de nuevo el botón abierto cierra su popover', () => {
    montar();
    fireEvent.click(boton('Capas'));
    fireEvent.click(boton('Capas'));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(boton('Capas').getAttribute('aria-expanded')).toBe('false');
  });

  it('al abrir un popover el foco entra a su primer control', () => {
    montar();
    fireEvent.click(boton('Capas'));
    expect(document.activeElement).toBe(within(screen.getByRole('dialog')).getAllByRole('checkbox')[0]);
    fireEvent.click(boton('Filtros'));
    expect(document.activeElement).toBe(within(screen.getByRole('dialog')).getAllByRole('button')[0]);
  });

  it('Escape cierra el popover y devuelve el foco a su botón', () => {
    montar();
    fireEvent.click(boton('Filtros'));
    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(boton('Filtros'));
  });

  it('un toque fuera lo cierra; un toque dentro del popover o en su botón no', () => {
    montar();
    fireEvent.click(boton('Capas'));
    fireEvent.pointerDown(screen.getByRole('checkbox', { name: 'Rutas' }));
    fireEvent.pointerDown(boton('Capas'));
    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.pointerDown(boton('fuera del mapa'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('Escape no cierra el popover de la leyenda mientras su diálogo de rangos está abierto', () => {
    montar();
    fireEvent.click(boton('Leyenda'));
    fireEvent.click(boton('Configurar rangos'));
    const rangos = screen.getByRole('dialog', { name: 'Rangos del semáforo' });
    // Un toque dentro del diálogo modal no es "fuera" del popover.
    fireEvent.pointerDown(rangos);
    fireEvent.keyDown(rangos, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Rangos del semáforo' })).toBeNull();
    expect(screen.getByRole('dialog', { name: 'Leyenda' })).toBeTruthy();
  });

  it('el botón Filtros lleva la cuenta de filtros activos, en su insignia y en su nombre accesible', () => {
    montar({ filtros: { tipos: ['MOTO'], carga: ['ROJO'], stock: [] } });
    const filtros = boton('Filtros (2 activos)');
    expect(filtros.textContent).toBe('2');
    cleanup();
    montar({ filtros: { tipos: ['MOTO'], carga: [], stock: [] } });
    expect(boton('Filtros (1 activo)')).toBeTruthy();
    cleanup();
    montar();
    expect(boton('Filtros').textContent).toBe('');
  });

  it('la cuenta se actualiza al marcar un filtro dentro del popover y limpiar la quita', () => {
    montar();
    fireEvent.click(boton('Filtros'));
    fireEvent.click(within(screen.getByRole('group', { name: 'Tipo de unidad' })).getByRole('button', { name: /^Moto/ }));
    expect(boton('Filtros (1 activo)')).toBeTruthy();
    fireEvent.click(boton('Limpiar filtros'));
    expect(boton('Filtros')).toBeTruthy();
  });

  it('Capas muestra las capas y el color de las unidades, y los cambios llegan al mapa', () => {
    const onCambiarCapa = vi.fn();
    montar({ onCambiarCapa });
    fireEvent.click(boton('Capas'));
    const popover = within(screen.getByRole('dialog', { name: 'Capas del mapa' }));
    ['Rutas', 'Unidades', 'Destinos', 'Bloqueos', 'Almacenes'].forEach((capa) => expect(popover.getByRole('checkbox', { name: capa })).toBeTruthy());
    fireEvent.click(popover.getByRole('checkbox', { name: 'Bloqueos' }));
    expect(onCambiarCapa).toHaveBeenCalledWith('bloqueos');
    expect(popover.getByRole('radio', { name: 'Carga' }).getAttribute('aria-checked')).toBe('true');
    fireEvent.click(popover.getByRole('radio', { name: 'Holgura' }));
    expect(popover.getByRole('radio', { name: 'Holgura' }).getAttribute('aria-checked')).toBe('true');
  });

  it('Ver todo y Modo enfoque actúan directo; el enfoque indica su estado con aria-pressed y cierra el popover abierto', () => {
    const onVerTodo = vi.fn();
    const onAlternarEnfoque = vi.fn();
    montar({ onVerTodo, onAlternarEnfoque });
    fireEvent.click(boton('Ver la malla completa'));
    expect(onVerTodo).toHaveBeenCalledTimes(1);
    expect(boton('Modo enfoque').getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(boton('Capas'));
    fireEvent.click(boton('Modo enfoque'));
    expect(onAlternarEnfoque).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('con el enfoque activo el botón se ve presionado', () => {
    montar({ enfoque: true });
    expect(boton('Modo enfoque').getAttribute('aria-pressed')).toBe('true');
  });

  it('las flechas arriba y abajo recorren los botones de la barra', () => {
    montar();
    boton('Capas').focus();
    fireEvent.keyDown(boton('Capas'), { key: 'ArrowDown' });
    expect(document.activeElement).toBe(boton('Filtros'));
    fireEvent.keyDown(boton('Filtros'), { key: 'ArrowUp' });
    fireEvent.keyDown(boton('Capas'), { key: 'ArrowUp' });
    expect(document.activeElement).toBe(boton('Modo enfoque'));
  });

  it('en un mapa angosto el popover va de borde a borde a la izquierda de la barra; si no, tiene ancho fijo', () => {
    montar({ angosto: true });
    fireEvent.click(boton('Capas'));
    const angosto = screen.getByRole('dialog');
    expect(angosto.style.left).toBe('12px');
    expect(angosto.style.right).toBe('68px');
    expect(angosto.style.width).toBe('');
    cleanup();
    montar();
    fireEvent.click(boton('Capas'));
    const ancho = screen.getByRole('dialog');
    expect(ancho.style.left).toBe('');
    expect(ancho.style.right).toBe('68px');
    expect(ancho.style.width).toBe('320px');
  });
});
