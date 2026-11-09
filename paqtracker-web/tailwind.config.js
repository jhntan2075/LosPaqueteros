/** @type {import('tailwindcss').Config} */

// Fuente única de la paleta. Se deriva del logo: cada cara del cubo cumple un rol.
// Documentación y reglas de uso: ../docs/design-system.md. Los contrastes se verifican en
// src/config/paleta.test.ts.
export const paleta = {
  // Neutros: los tonos de texto (300–900) van teñidos del navy del logo (hexágono = neutral-900); los de
  // fondo y borde (50–200) son grises casi blancos, sin tinte, para que las superficies se lean blancas.
  neutral: {
    50: '#F8F9FA',
    100: '#F1F3F5',
    200: '#E2E5E9',
    300: '#AEB8CB',
    400: '#8190AA',
    500: '#5F6F8C',
    600: '#465572',
    700: '#2F3C57',
    800: '#1A2540',
    900: '#0D152E',
  },
  // Cara izquierda (azul): acción y marca.
  primary: { 50: '#EEF3FF', 100: '#DCE6FF', 600: '#1B4DD9', 700: '#153CB0', 900: '#0F2468' },
  // Cara superior (celeste): información, unidad en proceso.
  info: { 50: '#EAF5FD', 600: '#1586D7', 700: '#0F6AAE' },
  // Cara derecha (naranja): atención, retraso. No es color de acento libre.
  warn: { 50: '#FFF3E8', 500: '#FB8229', 700: '#B44D08' },
  // Completan lo que el logo no tiene.
  ok: { 50: '#E6F6F0', 600: '#12805C', 700: '#0E6B4C' },
  critical: { 50: '#FDECEF', 600: '#C81E3A', 700: '#A3172F' },
}

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Tipografía única: Fira Sans. Cifras, horas, códigos y coordenadas usan `tabular-nums`
      // (dígitos de ancho fijo) en lugar de una fuente monoespaciada. Ver README, "Tipografía".
      fontFamily: {
        sans: ['"Fira Sans"', 'system-ui', 'sans-serif'],
      },
      // Escala tipográfica única (docs/propuesta-unificacion-ui.md §2.2). No escribir `text-[Npx]`.
      fontSize: {
        caption: ['11px', { lineHeight: '16px' }],
        overline: ['11px', { lineHeight: '16px', letterSpacing: '0.06em', fontWeight: '600' }],
        'body-sm': ['12px', { lineHeight: '16px' }],
        body: ['13px', { lineHeight: '20px' }],
        'title-sm': ['14px', { lineHeight: '20px', fontWeight: '600' }],
        title: ['18px', { lineHeight: '24px', fontWeight: '600' }],
        kpi: ['22px', { lineHeight: '28px', fontWeight: '600' }],
      },
      // Dos radios: controles (botón, input, pestaña) y superficies (tarjeta, panel, diálogo).
      borderRadius: {
        control: '6px',
        card: '10px',
      },
      // `shadow-xs` no existe en Tailwind 3.4: sin esta definición las tarjetas no tenían sombra.
      boxShadow: {
        '2xs': '0 1px 1px rgb(13 21 46 / 0.04)',
        xs: '0 1px 2px rgb(13 21 46 / 0.06)',
        overlay: '0 8px 24px rgb(13 21 46 / 0.16)',
      },
      // Entrada de cajones laterales (antes `animate-in slide-in-from-right`, de un plugin no instalado).
      keyframes: {
        'entrar-derecha': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
      },
      animation: {
        'entrar-derecha': 'entrar-derecha 200ms ease-out',
      },
      colors: paleta,
    },
  },
  plugins: [],
}
