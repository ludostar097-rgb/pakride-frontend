/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pakgreen: {
          50: '#eefbf4',
          100: '#d7f6e4',
          500: '#00a859',
          600: '#00904c',
          700: '#00733c',
          800: '#045b32',
          900: '#054b2a',
        },
        charcoal: {
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        urdu: ['Noto Nastaliq Urdu', 'Noto Sans Arabic', 'sans-serif']
      }
    },
  },
  plugins: [],
}
