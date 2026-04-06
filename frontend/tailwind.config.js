/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Poppins', 'system-ui', 'sans-serif'],
        heading: ['Poppins', 'Inter', 'system-ui', 'sans-serif']
      },
      colors: {
        primary: '#8B0000', // dark red
        secondary: '#1E1E1E', // charcoal gray
        accent: '#0D0D0D', // jet black
        light: '#F5F5F5',
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(135deg,#8B0000 0%, #400000 60%, #0D0D0D 100%)',
        'radial-spot': 'radial-gradient(circle at 30% 40%, rgba(255,255,255,0.08), transparent 60%)'
      },
      boxShadow: {
        'glow-red': '0 0 0 1px #8B0000, 0 0 12px -2px rgba(139,0,0,0.6)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: 0, transform: 'translateY(24px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' }
        },
        'scale-in': {
          '0%': { opacity: 0, transform: 'scale(.94)' },
          '100%': { opacity: 1, transform: 'scale(1)' }
        }
      },
      animation: {
        'fade-up': 'fade-up .6s ease-out forwards',
        'scale-in': 'scale-in .5s ease-out forwards'
      }
    },
  },
  plugins: [],
}



