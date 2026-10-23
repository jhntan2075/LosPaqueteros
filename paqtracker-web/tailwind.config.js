/** @type {import('tailwindcss').Config} */

// Fuente única de la paleta. Se deriva del logo: cada cara del cubo cumple un rol.
// Documentación y reglas de uso: ../docs/design-system.md. Los contrastes se verifican en
// src/config/paleta.test.ts.
export const paleta = {
  // Neutros teñidos del navy del logo (hexágono = neutral-900).
  neutral: {
    50: '#F4F6FA',
    100: '#E8ECF3',
    200: '#D3DAE6',
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
  critical: { 50: '#FDECEF', 600: '#C81E3A' },
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
      // Escala tipográfica: cinco tamaños por rol (ver docs/design-system.md, "Tipografía").
      // Sin interlineado propio: lo hereda el contenedor, como antes de la escala.
      fontSize: {
        caption: '11px', // metadatos, notas, rótulos de ejes
        body: '12px', // texto de interfaz por defecto: tablas, paneles, botones
        'body-lg': '14px', // texto de diálogos y formularios, títulos de sección
        title: '18px', // títulos de página
        display: '22px', // cifras y relojes destacados
      },
      colors: paleta,
    },
  },
  plugins: [],
}
