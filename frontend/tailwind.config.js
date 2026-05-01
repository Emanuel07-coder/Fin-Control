/**@type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Quiet Luxury Palette
        'paper': '#F9F9F9',
        'paper-dark': '#F5F5F5',
        'charcoal': '#1a1a1a',
        'charcoal-light': '#2a2a2a',
        'charcoal-lighter': '#3a3a3a',
        'rich-black': '#050505',
        'near-black': '#0f0f0f',
        // Single Muted Accent: Warm Gold
        'gold-accent': '#D4AF37',
        'gold-muted': '#B8962F',
        'gold-light': '#E5C565',
        // Utility Colors (muted, not saturated)
        'emerald-quiet': '#2d5a50',
        'emerald-text': '#7ba89d',
        'burgundy-quiet': '#5a2d2d',
        'burgundy-text': '#a97979',
      },
      fontFamily: {
        'display': ['Playfair Display', 'serif'],
        'sans': ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['2rem', { lineHeight: '2.5rem' }],
        '4xl': ['2.5rem', { lineHeight: '3rem' }],
        '5xl': ['3rem', { lineHeight: '1.2' }],
      },
      letterSpacing: {
        'tight': '-0.02em',
        'normal': '0em',
        'wide': '0.05em',
        'wider': '0.1em',
      },
      boxShadow: {
        'gold-glow': '0 0 15px rgba(212, 175, 55, 0.3)',
        'gold-glow-lg': '0 0 25px rgba(212, 175, 55, 0.4)',
        'subtle': '0 2px 12px rgba(0, 0, 0, 0.15)',
        'subtle-lg': '0 10px 40px rgba(0, 0, 0, 0.2)',
        'inset-subtle': 'inset 0 1px 2px rgba(255, 255, 255, 0.03)',
      },
      transitionDuration: {
        '250': '250ms',
        '350': '350ms',
      },
    },
  },
  plugins: [],
  darkMode: 'class',
}

