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
        // Core palette
        bg: {
          base: '#09090d',
          surface: '#131318',
          elevated: '#1a1a22',
          overlay: '#22222e',
        },
        border: {
          subtle: '#1e1e2c',
          default: '#2a2a3a',
          strong: '#3a3a50',
        },
        accent: {
          DEFAULT: '#6366f1',
          hover: '#5558e8',
          muted: '#6366f120',
          subtle: '#6366f110',
        },
        violet: {
          DEFAULT: '#8b5cf6',
          muted: '#8b5cf620',
        },
        text: {
          primary: '#f2f2f8',
          secondary: '#a0a0b8',
          muted: '#60607a',
          disabled: '#404055',
        },
        success: {
          DEFAULT: '#10b981',
          muted: '#10b98120',
        },
        warning: {
          DEFAULT: '#f59e0b',
          muted: '#f59e0b20',
        },
        danger: {
          DEFAULT: '#ef4444',
          muted: '#ef444420',
        },
        score: {
          low: '#ef4444',
          mid: '#f59e0b',
          high: '#10b981',
          peak: '#6366f1',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        'timer-xl': ['6rem', { lineHeight: '1', fontWeight: '300', letterSpacing: '-0.04em' }],
        'timer-lg': ['4rem', { lineHeight: '1', fontWeight: '300', letterSpacing: '-0.03em' }],
        'timer-md': ['2.5rem', { lineHeight: '1', fontWeight: '300', letterSpacing: '-0.02em' }],
      },
      animation: {
        'pulse-soft': 'pulse-soft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'fade-in': 'fade-in 0.4s ease-out',
        'slide-up': 'slide-up 0.4s ease-out',
        'waveform': 'waveform 0.8s ease-in-out infinite',
      },
      keyframes: {
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        glow: {
          from: { boxShadow: '0 0 20px rgba(99,102,241,0.2)' },
          to: { boxShadow: '0 0 40px rgba(99,102,241,0.5)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        waveform: {
          '0%, 100%': { transform: 'scaleY(0.3)' },
          '50%': { transform: 'scaleY(1)' },
        },
      },
      boxShadow: {
        'surface': '0 1px 3px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)',
        'elevated': '0 4px 24px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)',
        'glow-accent': '0 0 40px rgba(99,102,241,0.3)',
        'glow-success': '0 0 30px rgba(16,185,129,0.25)',
        'glow-danger': '0 0 30px rgba(239,68,68,0.25)',
        'inner-subtle': 'inset 0 1px 0 rgba(255,255,255,0.05)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
}

export default config
