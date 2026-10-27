/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#090d16',
        card: '#111827',
        accent: {
          green: '#10b981', // Snooker Felt Emerald
          gold: '#f59e0b',  // Trophy Amber Gold
          cyan: '#06b6d4',  // Neon Cyan
          purple: '#8b5cf6',// GDS Louvain Purple
          red: '#ef4444'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      }
    },
  },
  plugins: [],
}
