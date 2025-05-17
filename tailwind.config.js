/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx}',
    './src/pages/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'fairy-blue': {
          50: '#f0f5ff',
          100: '#e0eaff',
          200: '#c7d9ff',
          300: '#a5beff',
          400: '#819aff',
          500: '#5e73ff',
          600: '#3a4bf4',
          700: '#2c3ad8',
          800: '#2832ae',
          900: '#1f2a6c',
          950: '#111536',
        },
        'fairy-purple': {
          50: '#f7f0ff',
          100: '#efe0ff',
          200: '#e2c7ff',
          300: '#d1a1ff',
          400: '#bc6dff',
          500: '#a33dff',
          600: '#8c21f5',
          700: '#7818d8',
          800: '#6317ae',
          900: '#52178c',
          950: '#33095a',
        },
        'fairy-green': {
          50: '#f0fff4',
          100: '#d9ffe8',
          200: '#b4ffd1',
          300: '#7dffa9',
          400: '#39ff7a',
          500: '#0aee51',
          600: '#00c940',
          700: '#00a035',
          800: '#007d2d',
          900: '#006827',
          950: '#003a16',
        },
        'fairy-gold': {
          50: '#fefce8',
          100: '#fff9c2',
          200: '#fff087',
          300: '#ffe047',
          400: '#ffcf18',
          500: '#eeb505',
          600: '#cc8a02',
          700: '#a36005',
          800: '#854a0c',
          900: '#713c11',
          950: '#421f05',
        },
      },
      backgroundImage: {
        'fairy-gradient': 'linear-gradient(to right, var(--tw-gradient-stops))',
        'sparkle': "url('/images/sparkle.svg')",
      },
      boxShadow: {
        'fairy': '0 0 15px rgba(94, 115, 255, 0.5)',
        'fairy-hover': '0 0 25px rgba(94, 115, 255, 0.7)',
      },
      animation: {
        'sparkle': 'sparkle 1.5s linear infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        sparkle: {
          '0%, 100%': { opacity: 0.8, transform: 'scale(1)' },
          '50%': { opacity: 1, transform: 'scale(1.2)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
} 