import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#1e3a8a',
        gold: '#d4af37',
        cream: '#fdfbf7',
      },
      fontFamily: {
        sans: ['Inter', 'Manjari', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 18px 50px rgba(30, 58, 138, 0.12)',
      },
      backgroundImage: {
        'church-radial': 'radial-gradient(circle at top left, rgba(212,175,55,0.14), transparent 35%), radial-gradient(circle at bottom right, rgba(30,58,138,0.12), transparent 30%)',
      },
    },
  },
  plugins: [],
}

export default config
