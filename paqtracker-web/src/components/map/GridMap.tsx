import React, { useState } from 'react';
import { Search } from 'lucide-react';

interface GridMapProps {
  onHoverCoordenada?: (coord: { x: number; y: number }) => void;
  onRegistrarPedidoClick?: () => void;
  onColaPedidosClick?: () => void;
  onAbrirAyudaClick?: () => void;
}

export const GridMap: React.FC<GridMapProps> = ({
  onHoverCoordenada,
  onRegistrarPedidoClick,
  onColaPedidosClick,
  onAbrirAyudaClick,
}) => {
  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  const [elementoSeleccionado, setElementoSeleccionado] = useState<string | null>(null);

  // Dimensiones de la malla (cuadrícula ortogonal de Lima)
  const cols = 45;
  const rows = 22;
  const spacing = 28;
  const offsetX = 30;
  const offsetY = 55;

  // Manejador de movimiento del mouse sobre la malla para actualizar el nodo (x, y) del footer
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const gridX = Math.round((mouseX - offsetX) / spacing);
    const gridY = Math.round((mouseY - offsetY) / spacing);

    if (gridX >= 0 && gridX <= 70 && gridY >= 0 && gridY <= 50) {
      onHoverCoordenada?.({ x: gridX, y: gridY });
    }
  };

  return (
    <div className="relative flex-1 w-full h-full bg-white overflow-hidden select-none">
      {/* 1. Barra Flotante Superior Izquierda (Buscador y Alertas) */}
      <div className="absolute left-3 top-3 z-10 flex items-center gap-2">
        {/* Buscador de pedidos o unidades */}
        <div className="w-[206px] h-[32px] px-3 bg-white shadow-[0px_1px_4px_rgba(0,0,0,0.13)] rounded-full border border-[#E2E8F0] flex items-center gap-2">
          <Search className="w-3.5 h-3.5 text-[#64748B]" />
          <input
            type="text"
            placeholder="Buscar pedido o unidad"
            value={terminoBusqueda}
            onChange={(e) => setTerminoBusqueda(e.target.value)}
            className="w-full text-[12px] font-sans text-[#0F172A] placeholder-[#94A3B8] bg-transparent focus:outline-none"
          />
        </div>

        {/* Pill 14 en riesgo */}
        <div className="h-[32px] px-3 bg-white shadow-[0px_1px_4px_rgba(0,0,0,0.13)] rounded-full border border-[#E2E8F0] flex items-center gap-1.5">
          <span className="w-2 h-2 bg-[#B91C1C] rounded-full"></span>
          <span className="text-[#B91C1C] font-mono font-medium text-[12px]">14</span>
          <span className="text-[#64748B] font-sans text-[12px]">en riesgo</span>
        </div>

        {/* Pill Bloqueos y Averías */}
        <div className="h-[32px] px-3.5 bg-white shadow-[0px_1px_4px_rgba(0,0,0,0.13)] rounded-full border border-[#E2E8F0] flex items-center gap-1.5">
          <span className="w-2 h-2 bg-[#B45309] rounded-full"></span>
          <span className="text-[#B45309] font-mono font-medium text-[12px]">4</span>
          <span className="text-[#64748B] font-sans text-[12px]">bloqueos</span>

          <span className="w-1.5"></span>

          <span className="w-2 h-2 bg-[#B91C1C] rounded-full"></span>
          <span className="text-[#B91C1C] font-mono font-medium text-[12px]">2</span>
          <span className="text-[#64748B] font-sans text-[12px]">averías</span>
        </div>
      </div>

      {/* 2. Barra Flotante Superior Derecha (Acciones Rápidas) */}
      <div className="absolute right-4 top-3 z-10 flex items-center gap-2">
        {/* Cola de pedidos */}
        <button
          onClick={onColaPedidosClick}
          className="h-[32px] px-3.5 bg-white shadow-[0px_1px_4px_rgba(0,0,0,0.13)] rounded-full border border-[#E2E8F0] hover:bg-slate-50 transition flex items-center gap-1.5 cursor-pointer"
        >
          <span className="text-[#64748B] font-semibold text-sm leading-none">≡</span>
          <span className="text-[#64748B] font-sans font-medium text-[12px]">
            Cola de pedidos
          </span>
        </button>

        {/* Registrar pedido */}
        <button
          onClick={onRegistrarPedidoClick}
          className="h-[32px] px-4 bg-[#1E40AF] hover:bg-blue-800 shadow-[0px_1px_4px_rgba(0,0,0,0.13)] rounded-full text-white transition flex items-center gap-1.5 cursor-pointer"
        >
          <span className="font-semibold text-base leading-none">+</span>
          <span className="font-sans font-medium text-[12px]">Registrar pedido</span>
        </button>

        {/* Botón de Ayuda (?) */}
        <button
          onClick={onAbrirAyudaClick}
          className="w-[32px] h-[32px] bg-white shadow-[0px_1px_4px_rgba(0,0,0,0.13)] rounded-full border-2 border-[#1E40AF] hover:bg-blue-50 transition flex items-center justify-center cursor-pointer"
          title="Ayuda del sistema"
        >
          <span className="text-[#1E40AF] font-sans font-semibold text-[13px] leading-none">
            ?
          </span>
        </button>
      </div>

      {/* 3. Lienzo SVG de la Malla y Entidades */}
      <svg
        className="w-full h-full cursor-crosshair"
        onMouseMove={handleMouseMove}
        viewBox="0 0 1300 620"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Marcador de flecha para direcciones de tramos */}
          <marker
            id="arrow-blue"
            viewBox="0 0 6 6"
            refX="3"
            refY="3"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 6 3 L 0 6 z" fill="#1E40AF" />
          </marker>
          <marker
            id="arrow-slate"
            viewBox="0 0 6 6"
            refX="3"
            refY="3"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 6 3 L 0 6 z" fill="#94A3B8" />
          </marker>
        </defs>

        {/* Malla de Puntos y Aristas de la Red Vial */}
        <g opacity="0.65">
          {/* Líneas horizontales de la malla */}
          {Array.from({ length: rows }).map((_, r) => (
            <line
              key={`h-${r}`}
              x1={offsetX}
              y1={offsetY + r * spacing}
              x2={offsetX + (cols - 1) * spacing}
              y2={offsetY + r * spacing}
              stroke="#F1F5F9"
              strokeWidth="1"
            />
          ))}

          {/* Líneas verticales de la malla */}
          {Array.from({ length: cols }).map((_, c) => (
            <line
              key={`v-${c}`}
              x1={offsetX + c * spacing}
              y1={offsetY}
              x2={offsetX + c * spacing}
              y2={offsetY + (rows - 1) * spacing}
              stroke="#F1F5F9"
              strokeWidth="1"
            />
          ))}

          {/* Nodos de intersección (puntos) */}
          {Array.from({ length: rows }).map((_, r) =>
            Array.from({ length: cols }).map((_, c) => (
              <circle
                key={`p-${r}-${c}`}
                cx={offsetX + c * spacing}
                cy={offsetY + r * spacing}
                r="1.2"
                fill="#CBD5E1"
              />
            ))
          )}
        </g>

        {/* --- TRAMOS Y RUTAS PLANIFICADAS --- */}
        {/* Ruta 1: Superior (Azul activo hacia Central) */}
        <path
          d="M 390 140 L 530 140 L 530 200 L 530 250 L 660 250"
          fill="none"
          stroke="#1E40AF"
          strokeWidth="2.5"
          strokeDasharray="6 4"
        />
        {/* Flecha direccional en el tramo azul */}
        <path d="M 527 175 L 530 182 L 533 175" fill="none" stroke="#1E40AF" strokeWidth="2" />

        {/* Bloqueo vial sobre la ruta azul (estrella / barrera roja) */}
        <g transform="translate(530, 215)" className="cursor-pointer">
          <circle r="10" fill="#FEE2E2" />
          {/* Icono de bloqueo / asterisco rojo */}
          <path d="M -6 -6 L 6 6 M -6 6 L 6 -6 M 0 -8 L 0 8 M -8 0 L 8 0" stroke="#B91C1C" strokeWidth="2.5" />
        </g>

        {/* Ruta 2: Derecha (Gris discontinua hacia Almacén Interm. 2) */}
        <path
          d="M 850 410 L 850 250 L 920 250 L 920 150"
          fill="none"
          stroke="#94A3B8"
          strokeWidth="2"
          strokeDasharray="6 4"
        />
        {/* Flecha direccional hacia arriba */}
        <path d="M 847 285 L 850 277 L 853 285" fill="none" stroke="#94A3B8" strokeWidth="2" />

        {/* Ruta 3: Inferior (Gris discontinua hacia Almacén Interm. 1) */}
        <path
          d="M 480 435 L 640 435 L 640 330 L 740 330 L 740 420"
          fill="none"
          stroke="#94A3B8"
          strokeWidth="2"
          strokeDasharray="6 4"
        />
        {/* Flecha direccional hacia abajo */}
        <path d="M 637 395 L 640 402 L 643 395" fill="none" stroke="#94A3B8" strokeWidth="2" />

        {/* --- ALMACENES (Iconos y barras de stock) --- */}
        {/* 1. Almacén Central (Negro con techo blanco) */}
        <g
          transform="translate(680, 160)"
          className="cursor-pointer"
          onClick={() => setElementoSeleccionado('Almacén Central (Cap: 3000 / Stock: 2400)')}
        >
          {/* Base del icono */}
          <rect
            x="-14"
            y="-13"
            width="28"
            height="26"
            rx="3"
            fill="#0F172A"
            stroke="#FFFFFF"
            strokeWidth="2"
            filter="drop-shadow(0px 1px 3px rgba(0,0,0,0.25))"
          />
          {/* Puerta / Detalle blanco */}
          <rect x="-4" y="2" width="8" height="9" fill="#FFFFFF" rx="1" />
          {/* Etiqueta */}
          <text x="24" y="4" fill="#64748B" fontSize="12" fontFamily="Fira Code" fontWeight="500">
            Central
          </text>
        </g>

        {/* 2. Almacén Intermedio 1 (Verde / 62%) */}
        <g
          transform="translate(440, 340)"
          className="cursor-pointer"
          onClick={() => setElementoSeleccionado('Almacén Intermedio 1 (Stock: 62%)')}
        >
          {/* Base casa blanca con borde verde */}
          <rect
            x="-12"
            y="-11"
            width="24"
            height="22"
            rx="3"
            fill="#FFFFFF"
            stroke="#15803D"
            strokeWidth="2"
            filter="drop-shadow(0px 1px 2px rgba(0,0,0,0.16))"
          />
          {/* Barra de capacidad de fondo */}
          <rect x="-10" y="-2" width="20" height="11" rx="1" fill="#E2E8F0" />
          {/* Barra de stock verde (62%) */}
          <rect x="-10" y="2.5" width="20" height="6.8" rx="1" fill="#15803D" />
          {/* Etiqueta */}
          <text x="22" y="4" fill="#64748B" fontSize="12" fontFamily="Fira Code" fontWeight="500">
            Interm. 1 / 62 %
          </text>
        </g>

        {/* 3. Almacén Intermedio 2 (Rojo / 18%) */}
        <g
          transform="translate(870, 380)"
          className="cursor-pointer"
          onClick={() => setElementoSeleccionado('Almacén Intermedio 2 (Stock: 18%)')}
        >
          {/* Base casa blanca con borde rojo */}
          <rect
            x="-12"
            y="-11"
            width="24"
            height="22"
            rx="3"
            fill="#FFFFFF"
            stroke="#B91C1C"
            strokeWidth="2"
            filter="drop-shadow(0px 1px 2px rgba(0,0,0,0.16))"
          />
          {/* Barra de capacidad de fondo */}
          <rect x="-10" y="-2" width="20" height="11" rx="1" fill="#E2E8F0" />
          {/* Barra de stock rojo crítico (18%) */}
          <rect x="-10" y="6.8" width="20" height="2.2" rx="1" fill="#B91C1C" />
          {/* Etiqueta */}
          <text x="22" y="4" fill="#64748B" fontSize="12" fontFamily="Fira Code" fontWeight="500">
            Interm. 2 / 18 %
          </text>
        </g>

        {/* --- UNIDADES DE TRANSPORTE EN RUTA (Camiones/Motos/Bicis con indicadores de carga) --- */}
        {/* Unidad 1: Moto/Furgón (6/8 Ámbar en ruta azul) */}
        <g transform="translate(530, 140)" className="cursor-pointer">
          {/* Icono de vehículo / silueta */}
          <circle cx="-12" cy="0" r="4" fill="#B45309" />
          <rect x="-14" y="-7" width="10" height="6" rx="1" fill="#B45309" />
          {/* Indicador numérico 6/8 */}
          <text x="6" y="-3" fill="#64748B" fontSize="12" fontFamily="Fira Code" fontWeight="500">
            6/8
          </text>
          {/* Barra de capacidad de carga */}
          <rect x="6" y="2" width="24" height="4" rx="2" fill="#CBD5E1" />
          <rect x="6" y="2" width="18" height="4" rx="2" fill="#B45309" />
        </g>

        {/* Unidad 2: Auto/Camioneta (18/24 Ámbar en ruta derecha) */}
        <g transform="translate(850, 335)" className="cursor-pointer">
          {/* Silueta de auto */}
          <rect x="-16" y="-6" width="14" height="7" rx="2" fill="#B45309" />
          <circle cx="-13" cy="2" r="2.5" fill="#0F172A" />
          <circle cx="-5" cy="2" r="2.5" fill="#0F172A" />
          {/* Indicador numérico 18/24 */}
          <text x="6" y="-3" fill="#64748B" fontSize="12" fontFamily="Fira Code" fontWeight="500">
            18/24
          </text>
          {/* Barra de capacidad */}
          <rect x="6" y="2" width="24" height="4" rx="2" fill="#CBD5E1" />
          <rect x="6" y="2" width="18" height="4" rx="2" fill="#B45309" />
        </g>

        {/* Unidad 3: Bicicleta (2/4 Verde en ruta inferior) */}
        <g transform="translate(640, 420)" className="cursor-pointer">
          {/* Silueta de bicicleta */}
          <circle cx="-12" cy="0" r="3.5" fill="none" stroke="#15803D" strokeWidth="1.5" />
          <circle cx="-4" cy="0" r="3.5" fill="none" stroke="#15803D" strokeWidth="1.5" />
          <path d="M -12 0 L -8 -5 L -4 0" fill="none" stroke="#15803D" strokeWidth="1.5" />
          {/* Indicador numérico 2/4 */}
          <text x="8" y="-3" fill="#64748B" fontSize="12" fontFamily="Fira Code" fontWeight="500">
            2/4
          </text>
          {/* Barra de capacidad */}
          <rect x="8" y="2" width="24" height="4" rx="2" fill="#CBD5E1" />
          <rect x="8" y="2" width="12" height="4" rx="2" fill="#15803D" />
        </g>

        {/* --- PINES DE DESTINO Y ALERTAS DE ENTREGA --- */}
        {/* Pin Rojo Crítico con signo de exclamación (!) */}
        <g transform="translate(660, 250)" className="cursor-pointer">
          {/* Pin rojo */}
          <path
            d="M -9 -24 C -9 -29 9 -29 9 -24 C 9 -18 0 -4 0 0 C 0 -4 -9 -18 -9 -24 Z"
            fill="#B91C1C"
            stroke="#FFFFFF"
            strokeWidth="1.5"
            filter="drop-shadow(0px 1px 3px rgba(0,0,0,0.24))"
          />
          {/* Exclamación blanca */}
          <rect x="-1" y="-23" width="2" height="5.5" rx="1" fill="#FFFFFF" />
          <circle cx="0" cy="-15" r="1.2" fill="#FFFFFF" />
        </g>

        {/* Pin Ámbar (Alerta) */}
        <g transform="translate(920, 150)" className="cursor-pointer">
          <path
            d="M -9 -24 C -9 -29 9 -29 9 -24 C 9 -18 0 -4 0 0 C 0 -4 -9 -18 -9 -24 Z"
            fill="#B45309"
            stroke="#FFFFFF"
            strokeWidth="1.5"
            filter="drop-shadow(0px 1px 3px rgba(0,0,0,0.24))"
          />
          <circle cx="0" cy="-21" r="3" fill="#FFFFFF" />
        </g>

        {/* Pin Verde (Normal) */}
        <g transform="translate(480, 435)" className="cursor-pointer">
          <path
            d="M -9 -24 C -9 -29 9 -29 9 -24 C 9 -18 0 -4 0 0 C 0 -4 -9 -18 -9 -24 Z"
            fill="#15803D"
            stroke="#FFFFFF"
            strokeWidth="1.5"
            filter="drop-shadow(0px 1px 3px rgba(0,0,0,0.24))"
          />
          <circle cx="0" cy="-21" r="3" fill="#FFFFFF" />
        </g>
      </svg>

      {/* Notificación flotante si se hace clic en un elemento */}
      {elementoSeleccionado && (
        <div className="absolute bottom-4 right-4 z-20 bg-white border border-[#CBD5E1] shadow-lg rounded-lg p-3 text-xs flex items-center justify-between gap-4">
          <span className="font-mono text-[#0F172A]">{elementoSeleccionado}</span>
          <button
            onClick={() => setElementoSeleccionado(null)}
            className="text-[#64748B] hover:text-[#0F172A] font-bold text-xs"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};
