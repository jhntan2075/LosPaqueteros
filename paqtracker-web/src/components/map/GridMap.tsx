import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Search, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

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
  const containerRef = useRef<HTMLDivElement>(null);

  // Parámetros de la Malla de 70 x 50 Km (71 x 51 nodos)
  const MAX_X = 70; // 0 a 70 km (71 columnas)
  const MAX_Y = 50; // 0 a 50 km (51 filas)
  const SPACING = 30; // 30 px por cada kilómetro (nodo)
  const WORLD_WIDTH = MAX_X * SPACING; // 2100 px
  const WORLD_HEIGHT = MAX_Y * SPACING; // 1500 px

  // Estados de Zoom y Pan (Desplazamiento)
  const [zoom, setZoom] = useState(0.55);
  const [pan, setPan] = useState({ x: 50, y: 30 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Buscador y nodo actualmente bajo el cursor
  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  const [nodoActivo, setNodoActivo] = useState<{ x: number; y: number }>({ x: 19, y: 9 });
  const [elementoSeleccionado, setElementoSeleccionado] = useState<string | null>(null);

  // Centrar y ajustar el mapa completo de 70x50 km en pantalla
  const ajustarVistaCompleta = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    const scaleX = (clientWidth - 80) / WORLD_WIDTH;
    const scaleY = (clientHeight - 80) / WORLD_HEIGHT;
    const fitScale = Math.min(scaleX, scaleY, 1.0);

    const initialZoom = Math.max(0.35, fitScale);
    setZoom(initialZoom);
    setPan({
      x: (clientWidth - WORLD_WIDTH * initialZoom) / 2,
      y: (clientHeight - WORLD_HEIGHT * initialZoom) / 2,
    });
  }, [WORLD_WIDTH, WORLD_HEIGHT]);

  useEffect(() => {
    ajustarVistaCompleta();
    window.addEventListener('resize', ajustarVistaCompleta);
    return () => window.removeEventListener('resize', ajustarVistaCompleta);
  }, [ajustarVistaCompleta]);

  // Manejo de Zoom con la rueda del mouse centrado en el cursor
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const factor = e.deltaY < 0 ? 1.15 : 0.87;
    const newZoom = Math.min(Math.max(0.3, zoom * factor), 4.5);

    // Zoom hacia el punto donde está el mouse
    const newPanX = mouseX - (mouseX - pan.x) * (newZoom / zoom);
    const newPanY = mouseY - (mouseY - pan.y) * (newZoom / zoom);

    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  };

  // Manejo de Arrastre (Pan)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Solo clic izquierdo
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      });
    }

    // Detección del nodo (X, Y) dentro de [0..70] y [0..50]
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const worldX = (mouseX - pan.x) / zoom;
      const worldY = (mouseY - pan.y) / zoom;

      const gridX = Math.round(worldX / SPACING);
      const gridY = Math.round(worldY / SPACING);

      if (gridX >= 0 && gridX <= MAX_X && gridY >= 0 && gridY <= MAX_Y) {
        setNodoActivo({ x: gridX, y: gridY });
        onHoverCoordenada?.({ x: gridX, y: gridY });
      }
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  // Funciones de botones de zoom manual
  const zoomIn = () => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    const centerX = clientWidth / 2;
    const centerY = clientHeight / 2;
    const newZoom = Math.min(4.5, zoom * 1.25);
    setPan({
      x: centerX - (centerX - pan.x) * (newZoom / zoom),
      y: centerY - (centerY - pan.y) * (newZoom / zoom),
    });
    setZoom(newZoom);
  };

  const zoomOut = () => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    const centerX = clientWidth / 2;
    const centerY = clientHeight / 2;
    const newZoom = Math.max(0.3, zoom * 0.8);
    setPan({
      x: centerX - (centerX - pan.x) * (newZoom / zoom),
      y: centerY - (centerY - pan.y) * (newZoom / zoom),
    });
    setZoom(newZoom);
  };

  // Convertir coordenada de cuadrícula (km) a píxeles en el lienzo
  const toPx = (gridX: number, gridY: number) => ({
    x: gridX * SPACING,
    y: gridY * SPACING,
  });

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className={`relative flex-1 w-full h-full bg-white overflow-hidden select-none ${
        isDragging ? 'cursor-grabbing' : 'cursor-grab'
      }`}
    >
      {/* 1. Barra Flotante Superior Izquierda (Buscador y Alertas del Figma) */}
      <div className="absolute left-3 top-3 z-10 flex items-center gap-2 pointer-events-auto">
        {/* Buscador */}
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

      {/* 2. Barra Flotante Superior Derecha (Acciones de Pedidos y Ayuda) */}
      <div className="absolute right-4 top-3 z-10 flex items-center gap-2 pointer-events-auto">
        <button
          onClick={onColaPedidosClick}
          className="h-[32px] px-3.5 bg-white shadow-[0px_1px_4px_rgba(0,0,0,0.13)] rounded-full border border-[#E2E8F0] hover:bg-slate-50 transition flex items-center gap-1.5 cursor-pointer"
        >
          <span className="text-[#64748B] font-semibold text-sm leading-none">≡</span>
          <span className="text-[#64748B] font-sans font-medium text-[12px]">Cola de pedidos</span>
        </button>

        <button
          onClick={onRegistrarPedidoClick}
          className="h-[32px] px-4 bg-[#1E40AF] hover:bg-blue-800 shadow-[0px_1px_4px_rgba(0,0,0,0.13)] rounded-full text-white transition flex items-center gap-1.5 cursor-pointer"
        >
          <span className="font-semibold text-base leading-none">+</span>
          <span className="font-sans font-medium text-[12px]">Registrar pedido</span>
        </button>

        <button
          onClick={onAbrirAyudaClick}
          className="w-[32px] h-[32px] bg-white shadow-[0px_1px_4px_rgba(0,0,0,0.13)] rounded-full border-2 border-[#1E40AF] hover:bg-blue-50 transition flex items-center justify-center cursor-pointer"
          title="Ayuda del sistema"
        >
          <span className="text-[#1E40AF] font-sans font-semibold text-[13px] leading-none">?</span>
        </button>
      </div>

      {/* 3. Controles Flotantes de Zoom y Ajuste de Pantalla */}
      <div className="absolute right-4 bottom-12 z-10 flex flex-col gap-1.5 bg-white p-1.5 rounded-xl shadow-[0px_2px_8px_rgba(0,0,0,0.15)] border border-[#E2E8F0] pointer-events-auto">
        <button
          onClick={zoomIn}
          className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 rounded-lg text-[#64748B] hover:text-[#0F172A] transition cursor-pointer"
          title="Ampliar mapa (+)"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={zoomOut}
          className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 rounded-lg text-[#64748B] hover:text-[#0F172A] transition cursor-pointer"
          title="Reducir mapa (-)"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="w-full h-[1px] bg-[#E2E8F0] my-0.5"></div>
        <button
          onClick={ajustarVistaCompleta}
          className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 rounded-lg text-[#64748B] hover:text-[#0F172A] transition cursor-pointer"
          title="Ver malla completa 70 × 50 Km"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
        <span className="text-[9px] font-mono text-center text-[#94A3B8] font-bold block">
          {Math.round(zoom * 100)}%
        </span>
      </div>

      {/* 4. Etiqueta de Escala en la esquina inferior izquierda */}
      <div className="absolute left-4 bottom-12 z-10 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-md border border-[#E2E8F0] text-[11px] font-mono text-[#64748B] shadow-xs pointer-events-none">
        Área: 70 × 50 Km (71 × 51 Nodos) · 1 km = {Math.round(SPACING * zoom)} px
      </div>

      {/* 5. Lienzo SVG con Transformación de Zoom y Pan */}
      <svg className="w-full h-full">
        <defs>
          {/* Patrón de líneas y puntos de la cuadrícula de 70x50 km */}
          <pattern
            id="malla-70x50"
            width={SPACING}
            height={SPACING}
            patternUnits="userSpaceOnUse"
          >
            <line x1="0" y1="0" x2={SPACING} y2="0" stroke="#F1F5F9" strokeWidth="1" />
            <line x1="0" y1="0" x2="0" y2={SPACING} stroke="#F1F5F9" strokeWidth="1" />
            <circle cx="0" cy="0" r="1.2" fill="#CBD5E1" />
          </pattern>
        </defs>

        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* Fondo del área delimitada de 70 x 50 Km */}
          <rect
            x="0"
            y="0"
            width={WORLD_WIDTH}
            height={WORLD_HEIGHT}
            fill="#FFFFFF"
            stroke="#CBD5E1"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />

          {/* Patrón repetido de la malla ortogonal */}
          <rect
            x="0"
            y="0"
            width={WORLD_WIDTH}
            height={WORLD_HEIGHT}
            fill="url(#malla-70x50)"
          />

          {/* Borde exterior del perímetro de Lima Metropolitana */}
          <rect
            x="0"
            y="0"
            width={WORLD_WIDTH}
            height={WORLD_HEIGHT}
            fill="none"
            stroke="#94A3B8"
            strokeWidth="2"
          />

          {/* Etiquetas numéricas en los bordes cada 10 Km */}
          {Array.from({ length: 8 }).map((_, i) => (
            <text
              key={`label-x-${i}`}
              x={i * 10 * SPACING}
              y="-8"
              fill="#94A3B8"
              fontSize="11"
              fontFamily="Fira Code"
              textAnchor="middle"
            >
              {i * 10}k
            </text>
          ))}
          {Array.from({ length: 6 }).map((_, i) => (
            <text
              key={`label-y-${i}`}
              x="-8"
              y={i * 10 * SPACING + 4}
              fill="#94A3B8"
              fontSize="11"
              fontFamily="Fira Code"
              textAnchor="end"
            >
              {i * 10}k
            </text>
          ))}

          {/* --- TRAMOS DE RUTA PRINCIPALES --- */}
          {/* Ruta 1: Azul activa (Central a Nodo 19,9) */}
          <path
            d={`M ${toPx(19, 9).x} ${toPx(19, 9).y} L ${toPx(34, 9).x} ${toPx(34, 9).y} L ${toPx(34, 22).x} ${toPx(34, 22).y} L ${toPx(42, 22).x} ${toPx(42, 22).y}`}
            fill="none"
            stroke="#1E40AF"
            strokeWidth="3"
            strokeDasharray="7 5"
          />
          {/* Flecha direccional */}
          <path
            d={`M ${toPx(34, 15).x - 4} ${toPx(34, 15).y - 6} L ${toPx(34, 15).x} ${toPx(34, 15).y} L ${toPx(34, 15).x + 4} ${toPx(34, 15).y - 6}`}
            fill="none"
            stroke="#1E40AF"
            strokeWidth="2.5"
          />

          {/* Bloqueo vial sobre la ruta azul (estrella roja de bloqueo LE-037) */}
          <g transform={`translate(${toPx(34, 17).x}, ${toPx(34, 17).y})`} className="cursor-pointer">
            <circle r="12" fill="#FEE2E2" />
            <path
              d="M -7 -7 L 7 7 M -7 7 L 7 -7 M 0 -9 L 0 9 M -9 0 L 9 0"
              stroke="#B91C1C"
              strokeWidth="3"
            />
          </g>

          {/* Ruta 2: Secundaria hacia Almacén Intermedio 2 */}
          <path
            d={`M ${toPx(55, 42).x} ${toPx(55, 42).y} L ${toPx(55, 26).x} ${toPx(55, 26).y} L ${toPx(62, 26).x} ${toPx(62, 26).y} L ${toPx(62, 12).x} ${toPx(62, 12).y}`}
            fill="none"
            stroke="#94A3B8"
            strokeWidth="2.5"
            strokeDasharray="6 4"
          />
          <path
            d={`M ${toPx(55, 34).x - 4} ${toPx(55, 34).y + 6} L ${toPx(55, 34).x} ${toPx(55, 34).y} L ${toPx(55, 34).x + 4} ${toPx(55, 34).y + 6}`}
            fill="none"
            stroke="#94A3B8"
            strokeWidth="2.5"
          />

          {/* Ruta 3: Hacia Almacén Intermedio 1 */}
          <path
            d={`M ${toPx(18, 44).x} ${toPx(18, 44).y} L ${toPx(28, 44).x} ${toPx(28, 44).y} L ${toPx(28, 33).x} ${toPx(28, 33).y} L ${toPx(36, 33).x} ${toPx(36, 33).y} L ${toPx(36, 42).x} ${toPx(36, 42).y}`}
            fill="none"
            stroke="#94A3B8"
            strokeWidth="2.5"
            strokeDasharray="6 4"
          />

          {/* --- ALMACENES --- */}
          {/* 1. Almacén Central (Nodo 42, 16) */}
          <g
            transform={`translate(${toPx(42, 16).x}, ${toPx(42, 16).y})`}
            className="cursor-pointer"
            onClick={() => setElementoSeleccionado('Almacén Central (Cap: 3000 / Stock: 2400)')}
          >
            <rect
              x="-15"
              y="-14"
              width="30"
              height="28"
              rx="4"
              fill="#0F172A"
              stroke="#FFFFFF"
              strokeWidth="2"
              filter="drop-shadow(0px 1px 3px rgba(0,0,0,0.3))"
            />
            <rect x="-4" y="3" width="8" height="9" fill="#FFFFFF" rx="1" />
            <text x="26" y="5" fill="#64748B" fontSize="13" fontFamily="Fira Code" fontWeight="500">
              Central
            </text>
          </g>

          {/* 2. Almacén Intermedio 1 (Nodo 18, 30 / Verde 62%) */}
          <g
            transform={`translate(${toPx(18, 30).x}, ${toPx(18, 30).y})`}
            className="cursor-pointer"
            onClick={() => setElementoSeleccionado('Almacén Intermedio 1 (Stock: 62%)')}
          >
            <rect
              x="-13"
              y="-12"
              width="26"
              height="24"
              rx="3"
              fill="#FFFFFF"
              stroke="#15803D"
              strokeWidth="2"
              filter="drop-shadow(0px 1px 2px rgba(0,0,0,0.16))"
            />
            <rect x="-11" y="-2" width="22" height="12" rx="1" fill="#E2E8F0" />
            <rect x="-11" y="2.5" width="22" height="7.5" rx="1" fill="#15803D" />
            <text x="24" y="5" fill="#64748B" fontSize="13" fontFamily="Fira Code" fontWeight="500">
              Interm. 1 / 62 %
            </text>
          </g>

          {/* 3. Almacén Intermedio 2 (Nodo 55, 34 / Rojo 18%) */}
          <g
            transform={`translate(${toPx(55, 34).x}, ${toPx(55, 34).y})`}
            className="cursor-pointer"
            onClick={() => setElementoSeleccionado('Almacén Intermedio 2 (Stock: 18%)')}
          >
            <rect
              x="-13"
              y="-12"
              width="26"
              height="24"
              rx="3"
              fill="#FFFFFF"
              stroke="#B91C1C"
              strokeWidth="2"
              filter="drop-shadow(0px 1px 2px rgba(0,0,0,0.16))"
            />
            <rect x="-11" y="-2" width="22" height="12" rx="1" fill="#E2E8F0" />
            <rect x="-11" y="7.5" width="22" height="2.5" rx="1" fill="#B91C1C" />
            <text x="24" y="5" fill="#64748B" fontSize="13" fontFamily="Fira Code" fontWeight="500">
              Interm. 2 / 18 %
            </text>
          </g>

          {/* --- VEHÍCULOS EN RUTA --- */}
          {/* Unidad 1: Moto/Furgón (6/8 en nodo 34, 11) */}
          <g transform={`translate(${toPx(34, 11).x}, ${toPx(34, 11).y})`} className="cursor-pointer">
            <circle cx="-12" cy="0" r="4.5" fill="#B45309" />
            <rect x="-15" y="-7" width="11" height="7" rx="1" fill="#B45309" />
            <text x="6" y="-3" fill="#64748B" fontSize="13" fontFamily="Fira Code" fontWeight="500">
              6/8
            </text>
            <rect x="6" y="3" width="26" height="4" rx="2" fill="#CBD5E1" />
            <rect x="6" y="3" width="19" height="4" rx="2" fill="#B45309" />
          </g>

          {/* Unidad 2: Auto (18/24 en nodo 55, 30) */}
          <g transform={`translate(${toPx(55, 30).x}, ${toPx(55, 30).y})`} className="cursor-pointer">
            <rect x="-17" y="-7" width="15" height="8" rx="2" fill="#B45309" />
            <circle cx="-14" cy="2" r="2.5" fill="#0F172A" />
            <circle cx="-6" cy="2" r="2.5" fill="#0F172A" />
            <text x="6" y="-3" fill="#64748B" fontSize="13" fontFamily="Fira Code" fontWeight="500">
              18/24
            </text>
            <rect x="6" y="3" width="26" height="4" rx="2" fill="#CBD5E1" />
            <rect x="6" y="3" width="19" height="4" rx="2" fill="#B45309" />
          </g>

          {/* Unidad 3: Bicicleta (2/4 en nodo 28, 39) */}
          <g transform={`translate(${toPx(28, 39).x}, ${toPx(28, 39).y})`} className="cursor-pointer">
            <circle cx="-13" cy="0" r="4" fill="none" stroke="#15803D" strokeWidth="1.6" />
            <circle cx="-5" cy="0" r="4" fill="none" stroke="#15803D" strokeWidth="1.6" />
            <path d="M -13 0 L -9 -6 L -5 0" fill="none" stroke="#15803D" strokeWidth="1.6" />
            <text x="8" y="-3" fill="#64748B" fontSize="13" fontFamily="Fira Code" fontWeight="500">
              2/4
            </text>
            <rect x="8" y="3" width="26" height="4" rx="2" fill="#CBD5E1" />
            <rect x="8" y="3" width="13" height="4" rx="2" fill="#15803D" />
          </g>

          {/* --- PINES DE DESTINO --- */}
          {/* Pin Rojo (!) en nodo 42, 22 */}
          <g transform={`translate(${toPx(42, 22).x}, ${toPx(42, 22).y})`} className="cursor-pointer">
            <path
              d="M -10 -26 C -10 -31 10 -31 10 -26 C 10 -19 0 -4 0 0 C 0 -4 -10 -19 -10 -26 Z"
              fill="#B91C1C"
              stroke="#FFFFFF"
              strokeWidth="1.5"
              filter="drop-shadow(0px 1px 3px rgba(0,0,0,0.25))"
            />
            <rect x="-1" y="-25" width="2" height="6" rx="1" fill="#FFFFFF" />
            <circle cx="0" cy="-16" r="1.3" fill="#FFFFFF" />
          </g>

          {/* Pin Ámbar en nodo 62, 12 */}
          <g transform={`translate(${toPx(62, 12).x}, ${toPx(62, 12).y})`} className="cursor-pointer">
            <path
              d="M -10 -26 C -10 -31 10 -31 10 -26 C 10 -19 0 -4 0 0 C 0 -4 -10 -19 -10 -26 Z"
              fill="#B45309"
              stroke="#FFFFFF"
              strokeWidth="1.5"
              filter="drop-shadow(0px 1px 3px rgba(0,0,0,0.25))"
            />
            <circle cx="0" cy="-22" r="3" fill="#FFFFFF" />
          </g>

          {/* Pin Verde en nodo 18, 44 */}
          <g transform={`translate(${toPx(18, 44).x}, ${toPx(18, 44).y})`} className="cursor-pointer">
            <path
              d="M -10 -26 C -10 -31 10 -31 10 -26 C 10 -19 0 -4 0 0 C 0 -4 -10 -19 -10 -26 Z"
              fill="#15803D"
              stroke="#FFFFFF"
              strokeWidth="1.5"
              filter="drop-shadow(0px 1px 3px rgba(0,0,0,0.25))"
            />
            <circle cx="0" cy="-22" r="3" fill="#FFFFFF" />
          </g>

          {/* Retícula visual del nodo activo bajo el cursor */}
          <g transform={`translate(${toPx(nodoActivo.x, nodoActivo.y).x}, ${toPx(nodoActivo.x, nodoActivo.y).y})`}>
            <circle r="6" fill="none" stroke="#1E40AF" strokeWidth="1.5" strokeDasharray="2 2" className="animate-spin" />
            <circle r="2.5" fill="#1E40AF" />
          </g>
        </g>
      </svg>

      {/* Notificación flotante de inspección */}
      {elementoSeleccionado && (
        <div className="absolute bottom-12 right-16 z-20 bg-white border border-[#CBD5E1] shadow-lg rounded-lg p-3 text-xs flex items-center justify-between gap-4 pointer-events-auto">
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
