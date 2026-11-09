type Escala = Record<number, string>

type Paleta = {
  neutral: Escala
  primary: Escala
  info: Escala
  warn: Escala
  ok: Escala
  critical: Escala
}

type Funciones = Record<'fondo' | 'superficie' | 'inverso' | 'sobre-inverso' | 'sobre-color' | 'velo' | 'sombra', string>

export declare const paleta: Paleta
export declare const paletaOscura: Paleta
export declare const semanticos: { claro: Funciones; oscuro: Funciones }

declare const config: import('tailwindcss').Config
export default config
