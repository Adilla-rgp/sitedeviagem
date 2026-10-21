/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    // Paleta substituída (não estendida): só os tokens do CLAUDE.md ficam disponíveis.
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      bg: '#0E0D12',
      surface: {
        DEFAULT: '#17151E',
        sunken: '#131119',
        raised: '#1E1A2B',
      },
      line: {
        DEFAULT: '#2A2733',
        strong: '#3A3645',
        subtle: '#211F29',
      },
      ink: {
        DEFAULT: '#EDEBF2',
        soft: '#D6D3DE',
        muted: '#A19DAD',
      },
      accent: {
        DEFAULT: '#A78BFA',
        soft: '#C4B5FD',
        line: '#4C3F7A',
      },
      warn: {
        DEFAULT: '#F5B454',
        bg: '#2A2215',
        line: '#6B5427',
      },
      'neutral-link': '#4A4560',
    },
    fontFamily: {
      sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
      mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
    },
    borderRadius: {
      none: '0',
      sm: '6px', // etiquetas
      DEFAULT: '8px', // controles, campos e cartões
      panel: '10px', // painéis principais
      full: '9999px',
    },
    extend: {},
  },
  plugins: [],
}
