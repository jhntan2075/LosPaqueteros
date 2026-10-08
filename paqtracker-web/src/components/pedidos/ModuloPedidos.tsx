import React, { useState } from 'react';
import { useDatosOperacion } from '../../hooks/useDatosOperacion';
import type { PedidoRegistrado as Pedido, VistaPedidos } from '../../types/pedidos';
import { ColaPedidos } from './ColaPedidos';
import { EncabezadoPedidos } from './EncabezadoPedidos';
import { PedidoRegistrado } from './PedidoRegistrado';
import { RegistrarPedido } from './RegistrarPedido';

// Registro de pedidos de la operación día a día: cola (CU-04), registro (CU-01) y confirmación.

interface ModuloPedidosProps {
  vista: VistaPedidos;
  onCambiarVista: (vista: VistaPedidos) => void;
  onVerEnLienzo: () => void;
}

export const ModuloPedidos: React.FC<ModuloPedidosProps> = ({ vista, onCambiarVista, onVerEnLienzo }) => {
  const [registrado, setRegistrado] = useState<Pedido | null>(null);
  const { reloj } = useDatosOperacion();
  const volverACola = () => onCambiarVista('cola');

  if (vista === 'registrar' || (vista === 'registrado' && !registrado)) {
    return (
      <div className="flex-1 flex flex-col min-h-0 bg-[#F8FAFC]">
        <EncabezadoPedidos
          titulo="Registrar nuevo pedido"
          subtitulo="Ingresa cliente, destino (X, Y) y plazo para estimar factibilidad y planificar la ruta"
          onVolver={volverACola}
        />
        <RegistrarPedido
          onCancelar={volverACola}
          onRegistrado={(pedido) => {
            setRegistrado(pedido);
            onCambiarVista('registrado');
          }}
        />
      </div>
    );
  }

  if (vista === 'registrado' && registrado) {
    return (
      <div className="flex-1 flex flex-col min-h-0 bg-[#F8FAFC]">
        <EncabezadoPedidos
          titulo="Pedido registrado con éxito"
          subtitulo={`El pedido ${registrado.codigo} ha sido integrado y planificado en la flota`}
          onVolver={volverACola}
        />
        <PedidoRegistrado
          pedido={registrado}
          reloj={reloj}
          onVerEnLienzo={onVerEnLienzo}
          onRegistrarOtro={() => onCambiarVista('registrar')}
          onVerCola={volverACola}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#F8FAFC] p-4 lg:p-6 overflow-hidden">
      <ColaPedidos
        onRegistrar={() => onCambiarVista('registrar')}
        onVerEnLienzo={onVerEnLienzo}
      />
    </div>
  );
};
