import React from 'react';
import { Zap } from 'lucide-react';
import { esPlazoRegular } from '../../config/dominio';
import { etiquetaPlazo, tipoDeEntrega } from '../../config/glosario';
import { Insignia } from '../ui';

// Chip del plazo de un pedido. El plazo es un dato, no una alerta: siempre neutro. Lo priorizado se
// distingue por el ícono de rayo, no por el color (que queda para el semáforo de holgura).

interface InsigniaPlazoProps {
  plazoHoras: number;
  /** Solo "Regular" / "Priorizado", sin las horas (cuando las horas ya se muestran al lado). */
  soloTipo?: boolean;
}

export const InsigniaPlazo: React.FC<InsigniaPlazoProps> = ({ plazoHoras, soloTipo = false }) => (
  <Insignia tono="neutral">
    {!esPlazoRegular(plazoHoras) && <Zap className="size-3 shrink-0" aria-hidden="true" />}
    {soloTipo ? tipoDeEntrega(plazoHoras) : etiquetaPlazo(plazoHoras)}
  </Insignia>
);
