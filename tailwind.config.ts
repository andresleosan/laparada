import type { Config } from 'tailwindcss';

export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Paleta principal La Parada
        base: {
          dark: '#0A0A0A',
          darker: '#050505',
        },
        gold: {
          50: '#FBF8F1',
          100: '#F5EFDE',
          200: '#EDE4C7',
          300: '#D9C89A',
          400: '#C9A84C', // Acento principal
          500: '#B89835',
          600: '#9A7C2A',
          700: '#7B6220',
          800: '#5C4817',
          900: '#3D2F0F',
        },
        neutral: {
          50: '#F9F9F9',
          100: '#F0F0F0',
          200: '#E8E8E8',
          300: '#D4D4D4',
          400: '#A0A0A0',
          500: '#6B6B6B',
          600: '#525252',
          700: '#3B3B3B',
          800: '#242424',
          900: '#121212',
        },
        status: {
          pending: '#EAB308',   // Amarillo
          preparation: '#EA580C', // Naranja
          in_transit: '#0EA5E9', // Azul
          delivered: '#22C55E',  // Verde
          error: '#EF4444',      // Rojo
        },
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      },
      spacing: {
        safe: 'max(1rem, env(safe-area-inset-bottom))',
      },
      animation: {
        'pulse-subtle': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
  safelist: [
    // Badge states
    'bg-yellow-500',
    'bg-orange-500',
    'bg-blue-500',
    'bg-green-500',
    'text-yellow-500',
    'text-orange-500',
    'text-blue-500',
    'text-green-500',
  ],
} satisfies Config;
