import React from 'react';

export interface HeaderKPIsProps {
  pedidosEntregados: number;
  totalPedidos: number;
  pedidosEnRuta: number;
  pedidosEnEspera: number;
  pedidosEnRiesgoRojo: number;
  pedidosEnRiesgoAmbar: number;
  unidadesEnUso: number;
  totalUnidades: number;
  saturacion: number;
}

export const HeaderKPIs: React.FC<HeaderKPIsProps> = ({
  pedidosEntregados,
  totalPedidos,
  pedidosEnRuta,
  pedidosEnEspera,
  pedidosEnRiesgoRojo,
  pedidosEnRiesgoAmbar,
  unidadesEnUso,
  totalUnidades,
  saturacion,
}) => {
  const porcentajeEntregado = (totalPedidos === 0 ? 0 : (pedidosEntregados / totalPedidos) * 100).toFixed(1).replace('.', ',');
  const quiebre = saturacion >= 1;
  const alertaCarga = saturacion >= 0.7;

  return (
    <header
      className="h-[84px] bg-white border-b border-[#E2E8F0] px-4 py-2 flex items-center gap-2 overflow-x-auto select-none flex-shrink-0"
      role="region"
      aria-label="Indicadores clave de la operación"
    >
      {/* 1. Pedidos entregados */}
      <div className="flex-1 min-w-[150px] h-[70px] bg-white border border-[#E2E8F0] rounded-[6px] px-3 py-1.5 flex flex-col justify-between flex-shrink-0 overflow-hidden">
        <span className="text-[#64748B] text-[11px] font-medium leading-tight truncate">
          Pedidos entregados
        </span>
        <span className="text-[#0F172A] font-mono text-[19px] font-semibold leading-none">
          {pedidosEntregados}
        </span>
        <div className="flex flex-col leading-none">
          <span className="text-[#475569] text-[11px] truncate">
            {porcentajeEntregado}% de {totalPedidos} pedidos
          </span>
          <span className="text-[#94A3B8] text-[10px] truncate">
            registrados en el turno
          </span>
        </div>
      </div>

      {/* 2. Pedidos en ruta */}
      <div className="flex-1 min-w-[150px] h-[70px] bg-white border border-[#E2E8F0] rounded-[6px] px-3 py-1.5 flex flex-col justify-between flex-shrink-0 overflow-hidden">
        <span className="text-[#64748B] text-[11px] font-medium leading-tight truncate">
          En tránsito
        </span>
        <span className="text-[#1E40AF] font-mono text-[19px] font-semibold leading-none">
          {pedidosEnRuta}
        </span>
        <div className="flex flex-col leading-none">
          <span className="text-[#475569] text-[11px] truncate">
            A bordo de vehículos
          </span>
          <span className="text-[#94A3B8] text-[10px] truncate">
            en reparto activo
          </span>
        </div>
      </div>

      {/* 3. Pedidos en espera */}
      <div className="flex-1 min-w-[150px] h-[70px] bg-white border border-[#E2E8F0] rounded-[6px] px-3 py-1.5 flex flex-col justify-between flex-shrink-0 overflow-hidden">
        <span className="text-[#64748B] text-[11px] font-medium leading-tight truncate">
          Pendientes en almacén
        </span>
        <span className="text-[#0F172A] font-mono text-[19px] font-semibold leading-none">
          {pedidosEnEspera}
        </span>
        <div className="flex flex-col leading-none">
          <span className="text-[#475569] text-[11px] truncate">
            En espera de despacho
          </span>
          <span className="text-[#94A3B8] text-[10px] truncate">
            sin salir a ruta
          </span>
        </div>
      </div>

      {/* 4. Pedidos en riesgo */}
      <div className={`flex-1 min-w-[150px] h-[70px] bg-white border rounded-[6px] px-3 py-1.5 flex flex-col justify-between flex-shrink-0 overflow-hidden ${pedidosEnRiesgoRojo > 0 ? 'border-red-200 bg-red-50/20' : 'border-[#E2E8F0]'}`}>
        <span className="text-[#64748B] text-[11px] font-medium leading-tight truncate">
          Compromisos en riesgo
        </span>
        <div className="flex items-center gap-1.5 leading-none">
          <span className="w-2 h-2 bg-[#B91C1C] rounded-full"></span>
          <span className="text-[#B91C1C] font-mono text-[19px] font-semibold">
            {pedidosEnRiesgoRojo}
          </span>
          <span className="text-[#B45309] font-mono text-[19px] font-semibold ml-1">
            {pedidosEnRiesgoAmbar}
          </span>
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-[#475569] text-[11px] truncate">
            {pedidosEnRiesgoRojo} críticos · {pedidosEnRiesgoAmbar} advertencia
          </span>
          <span className="text-[#94A3B8] text-[10px] truncate">
            según plazo máximo
          </span>
        </div>
      </div>

      {/* 5. Flota en uso */}
      <div className="flex-1 min-w-[150px] h-[70px] bg-white border border-[#E2E8F0] rounded-[6px] px-3 py-1.5 flex flex-col justify-between flex-shrink-0 overflow-hidden">
        <span className="text-[#64748B] text-[11px] font-medium leading-tight truncate">
          Flota en operación
        </span>
        <span className="text-[#0F172A] font-mono text-[19px] font-semibold leading-none">
          {unidadesEnUso} / {totalUnidades}
        </span>
        <div className="flex flex-col leading-none">
          <span className="text-[#475569] text-[11px] truncate">
            Unidades en ruta
          </span>
          <span className="text-[#94A3B8] text-[10px] truncate">
            autos, motos y bicis
          </span>
        </div>
      </div>

      {/* 6. Saturación del sistema */}
      <div className={`flex-1 min-w-[150px] h-[70px] bg-white border rounded-[6px] px-3 py-1.5 flex flex-col justify-between flex-shrink-0 overflow-hidden ${quiebre ? 'border-red-200 bg-red-50/20' : 'border-[#E2E8F0]'}`}>
        <span className="text-[#64748B] text-[11px] font-medium leading-tight truncate">
          Carga operativa
        </span>
        <div className="flex items-center gap-1 leading-none">
          <span className={quiebre ? 'text-[#B91C1C] font-mono text-[19px] font-semibold' : 'text-[#B45309] font-mono text-[19px] font-semibold'}>
            {saturacion.toFixed(2).replace('.', ',')}
          </span>
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-[#475569] text-[11px] truncate">
            Demanda ÷ capacidad
          </span>
          <span className="text-[#94A3B8] text-[10px] truncate">
            {quiebre ? 'Quiebre operativo activo' : alertaCarga ? 'Alerta de saturación' : 'Rango normal'}
          </span>
        </div>
      </div>
    </header>
  );
};
