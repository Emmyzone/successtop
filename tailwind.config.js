/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#2B1D14',
        crust: { DEFAULT: '#7A4A2A', dark: '#5F3920', light: '#9A6238' },
        wheat: { DEFAULT: '#D9A441', soft: '#F1D9A3' },
        crumb: '#FAF3E6',
        line: '#EADFCB',
        muted: '#6E5B4C',
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        body: ['Figtree', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: { xl: '1rem', '2xl': '1.5rem' },
    },
  },
  plugins: [],
};
