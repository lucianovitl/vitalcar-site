import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        vitalcar: {
          red: '#ff1a1a',
          'red-dark': '#c40000',
          yellow: '#f5c518',
          bg: '#0d0b0a',
          'bg-2': '#151210',
          text: '#f5ecd8',
          'text-2': '#a89880',
          'text-3': '#6b5f4a',
          border: '#2a241f',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['var(--font-archivo)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-space-mono)', 'monospace'],
        heading: ['var(--font-archivo-black)', 'sans-serif'],
      },
      fontSize: {
        'fluid-xs': 'clamp(0.7rem, 0.65rem + 0.25vw, 0.85rem)',
        'fluid-sm': 'clamp(0.85rem, 0.75rem + 0.5vw, 1.1rem)',
        'fluid-base': 'clamp(1rem, 0.85rem + 0.75vw, 1.25rem)',
        'fluid-lg': 'clamp(1.25rem, 1rem + 1.25vw, 1.75rem)',
        'fluid-xl': 'clamp(1.75rem, 1.25rem + 2.5vw, 3rem)',
        'fluid-2xl': 'clamp(2.5rem, 1.5rem + 5vw, 5rem)',
        'fluid-3xl': 'clamp(3.5rem, 2rem + 7.5vw, 7rem)',
        'fluid-4xl': 'clamp(5rem, 3rem + 10vw, 10rem)',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '26': '6.5rem',
        '30': '7.5rem',
      },
      boxShadow: {
        'vitalcar': '4px 4px 0 hsl(var(--vitalcar-yellow))',
        'vitalcar-lg': '6px 6px 0 hsl(var(--vitalcar-yellow))',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'float': 'float 3s ease-in-out infinite',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
export default config