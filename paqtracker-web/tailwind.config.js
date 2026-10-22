/** @type {import('tailwindcss').Config} */
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
      colors: {
        brand: {
          blue: '#1E40AF',
          'blue-soft': '#DBEAFE',
          sidebar: '#F1F5F9',
          border: '#E2E8F0',
          'border-dark': '#CBD5E1',
          slate: {
            900: '#0F172A',
            500: '#64748B',
            400: '#94A3B8',
          },
          status: {
            green: '#15803D',
            amber: '#B45309',
            red: '#B91C1C',
          }
        }
      }
    },
  },
  plugins: [],
}
