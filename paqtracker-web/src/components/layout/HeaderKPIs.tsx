import React from 'react';
import { RelojOperacion } from './RelojOperacion';

export interface HeaderKPIsProps {
  relojSimulado?: string;
  pedidosEntregados?: number;
  totalPedidos?: number;
  pedidosEnRuta?: number;
  pedidosEnEspera?: number;
  pedidosEnRiesgoRojo?: number;
  pedidosEnRiesgoAmbar?: number;
  unidadesEnUso?: number;
  totalUnidades?: number;
  saturacion?: number;
}

export const HeaderKPIs: React.FC<HeaderKPIsProps> = ({
  relojSimulado = '25/08/2026 · 11:15:40',
  pedidosEntregados = 412,
  totalPedidos = 1305,
  pedidosEnRuta = 87,
  pedidosEnEspera = 806,
  pedidosEnRiesgoRojo = 3,
  pedidosEnRiesgoAmbar = 11,
  unidadesEnUso = 34,
  totalUnidades = 60,
  saturacion = 0.82,
}) => {
  const porcentajeEntregado = ((pedidosEntregados / totalPedidos) * 100).toFixed(1).replace('.', ',');

  return (
    <header className="h-[94px] bg-white border-b border-[#E2E8F0] px-4 py-2 flex items-center gap-2 overflow-x-auto select-none flex-shrink-0">
      {/* 1. Reloj de Operación */}
      <RelojOperacion relojSimulado={relojSimulado} />

      {/* Separador vertical */}
      <div className="w-[1px] h-[78px] bg-[#E2E8F0] flex-shrink-0 mx-1"></div>

      {/* 2. Pedidos entregados del día */}
      <div className="flex-1 min-w-[160px] h-[78px] bg-white border border-[#E2E8F0] rounded-[4px] px-3 py-1.5 flex flex-col justify-between flex-shrink-0 overflow-hidden">
        <span className="text-[#64748B] text-[12px] font-normal leading-tight truncate">
          Pedidos entregados del día
        </span>
        <span className="text-[#0F172A] font-mono text-[20px] font-semibold leading-none">
          {pedidosEntregados}
        </span>
        <div className="flex flex-col leading-none">
          <span className="text-[#64748B] text-[11px] truncate">
            {porcentajeEntregado} % de {totalPedidos} pedidos
          </span>
          <span className="text-[#94A3B8] text-[11px] truncate">
            en plazo 408 · fuera de plazo 4
          </span>
        </div>
      </div>

      {/* 3. Pedidos en ruta */}
      <div className="flex-1 min-w-[160px] h-[78px] bg-white border border-[#E2E8F0] rounded-[4px] px-3 py-1.5 flex flex-col justify-between flex-shrink-0 overflow-hidden">
        <span className="text-[#64748B] text-[12px] font-normal leading-tight truncate">
          Pedidos en ruta
        </span>
        <span className="text-[#0F172A] font-mono text-[20px] font-semibold leading-none">
          {pedidosEnRuta}
        </span>
        <div className="flex flex-col leading-none">
          <span className="text-[#64748B] text-[11px] truncate">
            a bordo de 34 unidades
          </span>
          <span className="text-[#94A3B8] text-[11px] truncate">
            próxima entrega en 6 min
          </span>
        </div>
      </div>

      {/* 4. Pedidos en espera */}
      <div className="flex-1 min-w-[160px] h-[78px] bg-white border border-[#E2E8F0] rounded-[4px] px-3 py-1.5 flex flex-col justify-between flex-shrink-0 overflow-hidden">
        <span className="text-[#64748B] text-[12px] font-normal leading-tight truncate">
          Pedidos en espera
        </span>
        <span className="text-[#0F172A] font-mono text-[20px] font-semibold leading-none">
          {pedidosEnEspera}
        </span>
        <div className="flex flex-col leading-none">
          <span className="text-[#64748B] text-[11px] truncate">
            aún no salen de almacén
          </span>
          <span className="text-[#94A3B8] text-[11px] truncate">
            sin ruta asignada 12
          </span>
        </div>
      </div>

      {/* 5. Pedidos en riesgo */}
      <div className="flex-1 min-w-[160px] h-[78px] bg-white border border-[#E2E8F0] rounded-[4px] px-3 py-1.5 flex flex-col justify-between flex-shrink-0 overflow-hidden">
        <span className="text-[#64748B] text-[12px] font-normal leading-tight truncate">
          Pedidos en riesgo
        </span>
        <div className="flex items-center gap-1.5 leading-none">
          <span className="w-2 h-2 bg-[#B91C1C] rounded-full"></span>
          <span className="text-[#B91C1C] font-mono text-[20px] font-semibold">
            {pedidosEnRiesgoRojo}
          </span>
          <span className="text-[#B45309] font-mono text-[20px] font-semibold ml-1">
            {pedidosEnRiesgoAmbar}
          </span>
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-[#64748B] text-[11px] truncate">
            {pedidosEnRiesgoRojo} en rojo · {pedidosEnRiesgoAmbar} en ámbar
          </span>
          <span className="text-[#94A3B8] text-[11px] truncate">
            holgura mínima 00:22
          </span>
        </div>
      </div>

      {/* 6. Unidades de transporte en uso */}
      <div className="flex-1 min-w-[160px] h-[78px] bg-white border border-[#E2E8F0] rounded-[4px] px-3 py-1.5 flex flex-col justify-between flex-shrink-0 overflow-hidden">
        <span className="text-[#64748B] text-[12px] font-normal leading-tight truncate">
          Unidades de transporte en uso
        </span>
        <span className="text-[#0F172A] font-mono text-[20px] font-semibold leading-none">
          {unidadesEnUso} / {totalUnidades}
        </span>
        <div className="flex flex-col leading-none">
          <span className="text-[#64748B] text-[11px] truncate">
            Auto 12 · Moto 14 · Bici 8
          </span>
          <span className="text-[#94A3B8] text-[11px] truncate">
            24 disponibles · 2 averiadas
          </span>
        </div>
      </div>

      {/* 7. Saturación del sistema */}
      <div className="flex-1 min-w-[160px] h-[78px] bg-white border border-[#E2E8F0] rounded-[4px] px-3 py-1.5 flex flex-col justify-between flex-shrink-0 overflow-hidden">
        <span className="text-[#64748B] text-[12px] font-normal leading-tight truncate">
          Saturación del sistema
        </span>
        <div className="flex items-center gap-1 leading-none">
          <span className="text-[#B45309] text-xs">▲</span>
          <span className="text-[#B45309] font-mono text-[20px] font-semibold">
            {saturacion.toFixed(2).replace('.', ',')}
          </span>
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-[#64748B] text-[11px] truncate">
            Pedidos en espera ÷ Capacidad
          </span>
          <span className="text-[#94A3B8] text-[11px] truncate">
            ámbar desde 0,70 · quiebre en 1,00
          </span>
        </div>
      </div>
    </header>
  );
};
