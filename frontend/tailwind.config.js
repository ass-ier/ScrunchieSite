/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f7f4',
          100: '#d9ebe3',
          200: '#b3d7c7',
          300: '#85bda5',
          400: '#5a9d82',
          500: '#1a3a2e',
          600: '#152f25',
          700: '#10241c',
          800: '#0c1914',
          900: '#070f0b',
        },
        accent: {
          50: '#fdfbf7',
          100: '#f5e6d3',
          200: '#ead1a7',
          300: '#deb87b',
          400: '#d4af37',
          500: '#c9a332',
          600: '#b8941f',
          700: '#9a7a19',
          800: '#7a6014',
          900: '#5c4810',
        },
        cream: '#faf8f3',
        dark: '#0a1612',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Cormorant Garamond', 'serif'],
      },
    },
  },
  plugins: [],
}
