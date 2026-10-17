/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        felt: '#1a6b3c',
        'felt-dark': '#0f4d2a',
        card: '#f8f5f0',
        gold: '#d4a843',
      },
      animation: {
        'deal': 'deal 0.3s ease-out forwards',
        'play': 'play 0.2s ease-out forwards',
        'bomb-flash': 'bombFlash 0.8s ease-out forwards',
        'rocket-flash': 'rocketFlash 1s ease-out forwards',
      },
      keyframes: {
        deal: {
          '0%': { transform: 'translate(-50%, -300px) scale(0.5)', opacity: '0' },
          '100%': { transform: 'translate(0, 0) scale(1)', opacity: '1' },
        },
        play: {
          '0%': { transform: 'translateY(0) scale(1.2)', opacity: '1' },
          '100%': { transform: 'translateY(-120px) scale(1)', opacity: '1' },
        },
        bombFlash: {
          '0%': { opacity: '0' },
          '20%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        rocketFlash: {
          '0%': { opacity: '0' },
          '15%': { opacity: '1', transform: 'scale(1.2)' },
          '100%': { opacity: '0', transform: 'scale(2)' },
        },
      },
    },
  },
  plugins: [],
};
