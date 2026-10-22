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
  /** Abre Operación con el pedido seleccionado y centrado en el lienzo. */
  onVerEnLienzo: (codigo: string) => void;
}

export const ModuloPedidos: React.FC<ModuloPedidosProps> = ({ vista, onCambiarVista, onVerEnLienzo }) => {
  const [registrado, setRegistrado] = useState<Pedido | null>(null);
  const { reloj, pedidos } = useDatosOperacion();
  const volverACola = () => onCambiarVista('cola');

  if (vista === 'registrar' || (vista === 'registrado' && !registrado)) {
    return (
      <div className="flex-1 flex flex-col min-h-0 bg-[#F8FAFC]">
        <EncabezadoPedidos
          titulo="Registrar nuevo pedido"
          subtitulo="Con el cliente, el destino y el plazo se estima si llega a tiempo antes de registrarlo"
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
          titulo="Pedido registrado"
          onVolver={volverACola}
        />
        <PedidoRegistrado
          pedido={registrado}
          reloj={reloj}
          // Solo se ofrece cuando el pedido ya figura en el estado en vivo: antes no hay nada que ubicar.
          onVerEnLienzo={pedidos[registrado.codigo] ? () => onVerEnLienzo(registrado.codigo) : undefined}
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
