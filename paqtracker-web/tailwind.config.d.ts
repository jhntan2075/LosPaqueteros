type Escala = Record<number, string>

export declare const paleta: {
  neutral: Escala
  primary: Escala
  info: Escala
  warn: Escala
  ok: Escala
  critical: Escala
}

declare const config: import('tailwindcss').Config
export default config
