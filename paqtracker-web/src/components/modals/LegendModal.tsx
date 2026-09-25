import React from 'react';
import { X } from 'lucide-react';

interface LegendModalProps {
  abierto: boolean;
  onCerrar: () => void;
}

export const LegendModal: React.FC<LegendModalProps> = ({ abierto, onCerrar }) => {
  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-[#CBD5E1] w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-3.5 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[#1E40AF] font-bold text-sm">?</span>
            <h3 className="font-sans font-semibold text-sm text-[#0F172A]">Leyenda de la Red de Operación</h3>
          </div>
          <button onClick={onCerrar} className="text-[#64748B] hover:text-[#0F172A] p-1 rounded-md transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs font-sans">
          {/* Semáforo y Holguras */}
          <div>
            <h4 className="font-semibold text-slate-800 mb-2">Semáforo de Holgura de Entrega (R-06, LE-078)</h4>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-[#15803D] rounded-[2px]"></span>
                <span className="font-mono text-[#0F172A]">&gt; 40 %</span>
                <span className="text-[#64748B]">— Operación normal, entrega con margen amplio.</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#B45309] text-xs">▲</span>
                <span className="font-mono text-[#0F172A]">15–40 %</span>
                <span className="text-[#64748B]">— Alerta de retraso moderado, requiere monitoreo.</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-[#B91C1C] rounded-full"></span>
                <span className="font-mono text-[#0F172A]">&lt; 15 %</span>
                <span className="text-[#64748B]">— Crítico / En riesgo inminente de incumplimiento de plazo.</span>
              </div>
            </div>
          </div>

          <div className="w-full h-[1px] bg-[#E2E8F0]"></div>

          {/* Almacenes */}
          <div>
            <h4 className="font-semibold text-slate-800 mb-2">Nodos de Almacenamiento</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-[#0F172A] rounded border border-white flex items-center justify-center">
                  <div className="w-2 h-2.5 bg-white rounded-[1px]"></div>
                </div>
                <div>
                  <span className="font-semibold text-[#0F172A] block">Almacén Central</span>
                  <span className="text-[#64748B]">Nodo principal de abastecimiento de alta capacidad.</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-white border-2 border-[#15803D] rounded flex items-center justify-center">
                  <div className="w-4 h-2 bg-[#15803D] rounded-[1px]"></div>
                </div>
                <div>
                  <span className="font-semibold text-[#0F172A] block">Almacenes Intermedios</span>
                  <span className="text-[#64748B]">La barra interior indica el nivel de stock en tiempo real.</span>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full h-[1px] bg-[#E2E8F0]"></div>

          {/* Rutas y Bloqueos */}
          <div>
            <h4 className="font-semibold text-slate-800 mb-2">Tramos y Bloqueos Viales</h4>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-6 h-0.5 bg-[#1E40AF]"></span>
                <span className="text-[#64748B]">Ruta en ejecución activa por unidad asignada.</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-0.5 border-b border-dashed border-[#94A3B8]"></span>
                <span className="text-[#64748B]">Ruta planificada pendiente o tramo secundario.</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 bg-red-100 text-[#B91C1C] rounded-full flex items-center justify-center font-bold text-[10px]">✕</span>
                <span className="text-[#64748B]">Bloqueo de vía programado o no transitable (LE-037).</span>
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 py-3 bg-[#F8FAFC] border-t border-[#E2E8F0] flex justify-end">
          <button onClick={onCerrar} className="px-4 py-1.5 bg-[#1E40AF] text-white rounded-md text-xs font-medium">
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
