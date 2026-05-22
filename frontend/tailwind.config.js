/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { 50: '#fef7ee', 100: '#fdedd3', 200: '#f9d7a5', 300: '#f5ba6e', 400: '#f09333', 500: '#ec7a12', 600: '#dd5f08', 700: '#b74709', 800: '#92380f', 900: '#762f10' },
      },
    },
  },
  plugins: [],
}
