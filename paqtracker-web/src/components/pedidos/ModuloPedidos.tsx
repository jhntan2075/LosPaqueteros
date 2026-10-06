import React, { useState } from 'react';
import { RELOJ_SIMULADO_EJEMPLO } from '../../mocks/pedidos';
import type { PedidoRegistrado as Pedido, VistaPedidos } from '../../types/pedidos';
import { ColaPedidos } from './ColaPedidos';
import { EncabezadoPedidos } from './EncabezadoPedidos';
import { PedidoRegistrado } from './PedidoRegistrado';
import { RegistrarPedido } from './RegistrarPedido';

interface ModuloPedidosProps {
  vista: VistaPedidos;
  relojSimulado: string;
  onCambiarVista: (vista: VistaPedidos) => void;
  onVerEnLienzo: () => void;
}

export const ModuloPedidos: React.FC<ModuloPedidosProps> = ({ vista, relojSimulado, onCambiarVista, onVerEnLienzo }) => {
  const [registrado, setRegistrado] = useState<Pedido | null>(null);
  // Mientras no llegue el reloj de paqtracker-api, los cálculos de hora usan el del diseño.
  const reloj = RELOJ_SIMULADO_EJEMPLO;
  const volverACola = () => onCambiarVista('cola');

  if (vista === 'registrar' || (vista === 'registrado' && !registrado)) {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        <EncabezadoPedidos titulo="Registrar pedido" relojSimulado={relojSimulado} onVolver={volverACola} />
        <RegistrarPedido
          reloj={reloj}
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
      <div className="flex-1 flex flex-col min-h-0">
        <EncabezadoPedidos titulo="Pedido registrado" relojSimulado={relojSimulado} onVolver={volverACola} />
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
    <div className="flex-1 flex flex-col min-h-0 pt-[50px]">
      <ColaPedidos onRegistrar={() => onCambiarVista('registrar')} />
    </div>
  );
};
