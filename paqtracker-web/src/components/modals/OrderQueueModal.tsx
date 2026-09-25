import React from 'react';
import { X, Clock, AlertCircle } from 'lucide-react';

interface OrderQueueModalProps {
  abierto: boolean;
  onCerrar: () => void;
}

export const OrderQueueModal: React.FC<OrderQueueModalProps> = ({ abierto, onCerrar }) => {
  if (!abierto) return null;

  const pedidosCola = [
    { id: 'PED-1029', destino: '(19, 9)', paquetes: 5, holgura: '00:18', estado: 'ROJO', almacen: 'Central' },
    { id: 'PED-1030', destino: '(42, 28)', paquetes: 12, holgura: '00:32', estado: 'AMBAR', almacen: 'Central' },
    { id: 'PED-1031', destino: '(11, 35)', paquetes: 3, holgura: '01:15', estado: 'VERDE', almacen: 'Interm. 1' },
    { id: 'PED-1032', destino: '(55, 12)', paquetes: 8, holgura: '01:40', estado: 'VERDE', almacen: 'Interm. 2' },
    { id: 'PED-1033', destino: '(24, 18)', paquetes: 6, holgura: '00:22', estado: 'AMBAR', almacen: 'Central' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-[#CBD5E1] w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-3.5 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[#64748B] font-bold text-sm">≡</span>
            <h3 className="font-sans font-semibold text-sm text-[#0F172A]">Cola de Pedidos en Espera (806)</h3>
          </div>
          <button onClick={onCerrar} className="text-[#64748B] hover:text-[#0F172A] p-1 rounded-md transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 max-h-[380px] overflow-y-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead>
              <tr className="border-b border-[#E2E8F0] text-[#64748B]">
                <th className="pb-2 font-medium">Código</th>
                <th className="pb-2 font-medium">Destino</th>
                <th className="pb-2 font-medium">Cantidad</th>
                <th className="pb-2 font-medium">Almacén Origen</th>
                <th className="pb-2 font-medium">Holgura</th>
                <th className="pb-2 font-medium">Semáforo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {pedidosCola.map((ped) => (
                <tr key={ped.id} className="hover:bg-slate-50">
                  <td className="py-2.5 font-mono font-medium text-[#0F172A]">{ped.id}</td>
                  <td className="py-2.5 font-mono text-[#64748B]">{ped.destino}</td>
                  <td className="py-2.5 font-mono">{ped.paquetes} paq.</td>
                  <td className="py-2.5 text-[#64748B]">{ped.almacen}</td>
                  <td className="py-2.5 font-mono flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#94A3B8]" />
                    <span>{ped.holgura}</span>
                  </td>
                  <td className="py-2.5">
                    {ped.estado === 'ROJO' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-red-100 text-[#B91C1C] flex items-center gap-1 w-max">
                        <AlertCircle className="w-3 h-3" /> Crítico (&lt; 15%)
                      </span>
                    )}
                    {ped.estado === 'AMBAR' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-100 text-[#B45309] w-max block">
                        Alerta (15-40%)
                      </span>
                    )}
                    {ped.estado === 'VERDE' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-green-100 text-[#15803D] w-max block">
                        Normal (&gt; 40%)
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 bg-[#F8FAFC] border-t border-[#E2E8F0] flex justify-between items-center text-xs">
          <span className="text-[#94A3B8]">Mostrando primeros 5 pedidos prioritarios</span>
          <button onClick={onCerrar} className="px-4 py-1.5 bg-[#1E40AF] text-white rounded-md font-medium transition">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
