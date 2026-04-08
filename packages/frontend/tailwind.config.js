/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fef1f7',
          100: '#fde3f1',
          200: '#fbc7e6',
          300: '#f9a3d4',
          400: '#f569bc',
          500: '#ec347c',
          600: '#d91563',
          700: '#bb0d52',
          800: '#8b0a3f',
          900: '#5a0629',
        },
        trading: {
          green: '#10b981',
          red: '#ef4444',
          amber: '#f59e0b',
          blue: '#ec347c',
          slate: '#64748b'
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace']
      },
      boxShadow: {
        'glow': '0 0 20px rgba(236, 52, 124, 0.3)',
        'glow-md': '0 0 30px rgba(236, 52, 124, 0.4)',
      }
    },
  },
  plugins: [],
}
