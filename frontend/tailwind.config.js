/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Metallic blue theme from the provided image
        primary: {
          50: '#EDE8F5',
          100: '#ADBDDA',
          200: '#8697C4',
          300: '#7091E6',
          400: '#5D7AD1',
          500: '#3D52A0',
          600: '#324283',
          700: '#283266',
          800: '#1E2549',
          900: '#14182C'
        },
        dark: {
          100: '#1e293b', // Slate 800
          200: '#0f172a', // Slate 900
          300: '#020617', // Slate 950
          border: '#334155' // Slate 700
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Georgia', 'serif'],
        mono: ['Roboto Mono', 'monospace'],
      },
      boxShadow: {
        'card': '0 4px 20px rgba(0, 0, 0, 0.08)',
        'card-hover': '0 10px 30px rgba(0, 0, 0, 0.12)',
        'nav': '0 2px 10px rgba(0, 0, 0, 0.05)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-in-right': 'slideInRight 0.5s ease-out',
        'progress': 'progressWidth 1.5s ease-out',
        'shimmer': 'shimmer 1.5s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        progressWidth: {
          '0%': { width: '0%' },
          '100%': { width: '100%' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-500px 0' },
          '100%': { backgroundPosition: '500px 0' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'metallic': 'linear-gradient(to right, #3D52A0, #7091E6, #8697C4, #ADBDDA, #EDE8F5)',
      },
      gridTemplateRows: {
        'layout': 'auto 1fr auto',
      },
    },
  },
  plugins: [],
}