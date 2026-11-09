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

// Tema oscuro (clase `oscuro` en <html>). Mismos roles que la paleta clara: la escala neutra se invierte
// (50 = superficie sutil, 900 = texto principal) y los colores de estado suben de brillo para leerse sobre
// fondo oscuro. Los contrastes también se verifican en src/config/paleta.test.ts.
export const paletaOscura = {
  neutral: {
    50: '#172033',
    100: '#1E293D',
    200: '#2A364D',
    300: '#3C4A64',
    400: '#5B6A87',
    500: '#8592AD',
    600: '#A4AFC5',
    700: '#C3CBDA',
    800: '#DCE1EA',
    900: '#EEF1F6',
  },
  primary: { 50: '#17264D', 100: '#1E3366', 600: '#5B85F7', 700: '#8EAEFF', 900: '#D6E2FF' },
  info: { 50: '#0F2B40', 600: '#3EA3EC', 700: '#7CC4F5' },
  warn: { 50: '#35220F', 500: '#FB8229', 700: '#FFAE6B' },
  ok: { 50: '#0F2D24', 600: '#2DB07F', 700: '#5BD3A3' },
  critical: { 50: '#3D1621', 600: '#F2627A', 700: '#FF95A6' },
}

// Colores por función, para lo que no es un tono de la escala:
//  fondo          lienzo de la aplicación.
//  superficie     tarjetas, paneles y diálogos (antes `bg-white`).
//  inverso        avisos y descripciones emergentes: contrastan con la superficie en los dos temas.
//  sobre-inverso  texto sobre `inverso`.
//  sobre-color    texto sobre un relleno de color (botón primario, contador, banda de la corrida).
//  velo           capa que oscurece la página detrás de un diálogo (se usa con opacidad: `bg-velo/40`).
//  sombra         color de las sombras.
export const semanticos = {
  claro: {
    fondo: '#FFFFFF',
    superficie: '#FFFFFF',
    inverso: '#0D152E',
    'sobre-inverso': '#FFFFFF',
    'sobre-color': '#FFFFFF',
    velo: '#0D152E',
    sombra: '#0D152E',
  },
  oscuro: {
    fondo: '#0B1120',
    superficie: '#111A2C',
    inverso: '#E8ECF3',
    'sobre-inverso': '#0D152E',
    'sobre-color': '#0B1120',
    velo: '#000000',
    sombra: '#000000',
  },
}

/** "#1B4DD9" → "27 77 217": canales para `rgb(var(--x) / <alpha-value>)`, así funcionan `bg-velo/40` y similares. */
const canales = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(' ')

/** Variables CSS de un tema: `--color-neutral-50`, `--color-superficie`… */
const variablesDe = (tonos, funciones) => ({
  ...Object.fromEntries(
    Object.entries(tonos).flatMap(([grupo, escala]) => Object.entries(escala).map(([tono, hex]) => [`--color-${grupo}-${tono}`, canales(hex)])),
  ),
  ...Object.fromEntries(Object.entries(funciones).map(([nombre, hex]) => [`--color-${nombre}`, canales(hex)])),
})

const variable = (nombre) => `rgb(var(--color-${nombre}) / <alpha-value>)`

/** Las clases (`bg-neutral-50`, `text-primary-600`, `bg-superficie`) leen la variable del tema activo. */
const colores = {
  ...Object.fromEntries(
    Object.entries(paleta).map(([grupo, escala]) => [grupo, Object.fromEntries(Object.keys(escala).map((tono) => [tono, variable(`${grupo}-${tono}`)]))]),
  ),
  ...Object.fromEntries(Object.keys(semanticos.claro).map((nombre) => [nombre, variable(nombre)])),
  // Panel de marca del login: azul marino en los dos temas.
  marca: '#0D152E',
}

/** Declara las variables de los dos temas; al imprimir siempre rige el claro. */
const temas = {
  handler: ({ addBase }) => {
    const claro = { ...variablesDe(paleta, semanticos.claro), 'color-scheme': 'light' }
    addBase({
      ':root': claro,
      ':root.oscuro': { ...variablesDe(paletaOscura, semanticos.oscuro), 'color-scheme': 'dark' },
      '@media print': { ':root.oscuro': claro },
    })
  },
}


export default {
  darkMode: ['selector', '.oscuro'],
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
        '2xs': '0 1px 1px rgb(var(--color-sombra) / 0.04)',
        xs: '0 1px 2px rgb(var(--color-sombra) / 0.06)',
        overlay: '0 8px 24px rgb(var(--color-sombra) / 0.16)',
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
      colors: colores,
    },
  },
  plugins: [temas],
}
