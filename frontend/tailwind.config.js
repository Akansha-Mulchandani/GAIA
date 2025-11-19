/**** Tailwind Config ****/
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        emerald: '#10B981',
        deepblue: '#0EA5E9',
        amber: '#F59E0B',
        purple: '#8B5CF6',
        rose: '#F43F5E',
      }
    },
  },
  plugins: [],
}
