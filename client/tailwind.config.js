/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#070C15',
          DEFAULT: '#0B1220',
          800: '#111B30',
          700: '#1E293B',
        },
        brand: {
          primary: '#2563EB',
          electric: '#3B82F6',
          light: '#60A5FA',
          subtle: '#EFF6FF',
          dark: '#1D4ED8',
        },
        surface: {
          bg: '#F8FAFC',
          card: '#FFFFFF',
          border: '#E2E8F0',
          muted: '#64748B',
          text: '#111827',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        subtle: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        card: '0 4px 6px -1px rgba(11, 18, 32, 0.05), 0 2px 4px -2px rgba(11, 18, 32, 0.05)',
        elevated: '0 10px 15px -3px rgba(11, 18, 32, 0.08), 0 4px 6px -4px rgba(11, 18, 32, 0.04)',
      },
    },
  },
  plugins: [],
}

