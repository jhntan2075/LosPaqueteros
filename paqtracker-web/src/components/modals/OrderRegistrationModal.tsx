import React, { useState } from 'react';
import { X, UploadCloud, PlusCircle } from 'lucide-react';

interface OrderRegistrationModalProps {
  abierto: boolean;
  onCerrar: () => void;
  onRegistrarPedido?: (pedido: any) => void;
}

export const OrderRegistrationModal: React.FC<OrderRegistrationModalProps> = ({
  abierto,
  onCerrar,
}) => {
  const [modo, setModo] = useState<'manual' | 'archivo'>('manual');
  const [posX, setPosX] = useState('');
  const [posY, setPosY] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [limiteMinutos, setLimiteMinutos] = useState('120');

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-[#CBD5E1] w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Encabezado */}
        <div className="px-5 py-3.5 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-[#1E40AF] rounded-full"></span>
            <h3 className="font-sans font-semibold text-sm text-[#0F172A]">Registrar Nuevo Pedido</h3>
          </div>
          <button
            onClick={onCerrar}
            className="text-[#64748B] hover:text-[#0F172A] p-1 rounded-md transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selector de modo */}
        <div className="flex border-b border-[#E2E8F0] px-5 pt-3 gap-4 text-xs font-sans">
          <button
            onClick={() => setModo('manual')}
            className={`pb-2.5 font-medium transition border-b-2 cursor-pointer ${
              modo === 'manual'
                ? 'border-[#1E40AF] text-[#1E40AF]'
                : 'border-transparent text-[#64748B] hover:text-slate-900'
            }`}
          >
            Registro Individual Manual
          </button>
          <button
            onClick={() => setModo('archivo')}
            className={`pb-2.5 font-medium transition border-b-2 cursor-pointer ${
              modo === 'archivo'
                ? 'border-[#1E40AF] text-[#1E40AF]'
                : 'border-transparent text-[#64748B] hover:text-slate-900'
            }`}
          >
            Carga Masiva (ventas2026mm)
          </button>
        </div>

        {/* Cuerpo */}
        <div className="p-5 text-xs">
          {modo === 'manual' ? (
            <div className="space-y-3.5 font-sans">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#64748B] block mb-1 font-medium">Coordenada Destino X</label>
                  <input
                    type="number"
                    placeholder="Ej. 19"
                    value={posX}
                    onChange={(e) => setPosX(e.target.value)}
                    className="w-full border border-[#CBD5E1] rounded-lg p-2 font-mono text-xs focus:ring-1 focus:ring-[#1E40AF] outline-none"
                  />
                </div>
                <div>
                  <label className="text-[#64748B] block mb-1 font-medium">Coordenada Destino Y</label>
                  <input
                    type="number"
                    placeholder="Ej. 9"
                    value={posY}
                    onChange={(e) => setPosY(e.target.value)}
                    className="w-full border border-[#CBD5E1] rounded-lg p-2 font-mono text-xs focus:ring-1 focus:ring-[#1E40AF] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#64748B] block mb-1 font-medium">Cantidad de Paquetes</label>
                  <input
                    type="number"
                    placeholder="Ej. 5"
                    value={cantidad}
                    onChange={(e) => setCantidad(e.target.value)}
                    className="w-full border border-[#CBD5E1] rounded-lg p-2 font-mono text-xs focus:ring-1 focus:ring-[#1E40AF] outline-none"
                  />
                </div>
                <div>
                  <label className="text-[#64748B] block mb-1 font-medium">Ventana de Tiempo (minutos)</label>
                  <input
                    type="number"
                    value={limiteMinutos}
                    onChange={(e) => setLimiteMinutos(e.target.value)}
                    className="w-full border border-[#CBD5E1] rounded-lg p-2 font-mono text-xs focus:ring-1 focus:ring-[#1E40AF] outline-none"
                  />
                </div>
              </div>

              <p className="text-[11px] text-[#94A3B8]">
                El pedido ingresará en la siguiente iteración de planificación (Sa) y será enrutado automáticamente.
              </p>
            </div>
          ) : (
            <div className="border-2 border-dashed border-[#CBD5E1] rounded-lg p-6 text-center hover:border-[#1E40AF] transition cursor-pointer">
              <UploadCloud className="w-8 h-8 text-[#1E40AF] mx-auto mb-2" />
              <span className="text-xs font-medium text-[#0F172A] block">
                Selecciona el archivo mensual de ventas (.txt)
              </span>
              <span className="text-[11px] text-[#94A3B8] block mt-1">
                Formato estándar: fecha, hora, destino, cantidad, cliente
              </span>
            </div>
          )}
        </div>

        {/* Pie */}
        <div className="px-5 py-3 bg-[#F8FAFC] border-t border-[#E2E8F0] flex justify-end gap-2 text-xs">
          <button
            onClick={onCerrar}
            className="px-3.5 py-1.5 border border-[#CBD5E1] rounded-md text-[#64748B] hover:bg-slate-100 transition"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              alert('Pedido registrado exitosamente. Se integrará al plan de ruta.');
              onCerrar();
            }}
            className="px-4 py-1.5 bg-[#1E40AF] hover:bg-blue-800 text-white rounded-md font-medium transition flex items-center gap-1.5"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Confirmar Registro</span>
          </button>
        </div>
      </div>
    </div>
  );
};
