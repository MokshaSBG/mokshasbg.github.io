/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        term: {
          green: '#33ff33',      // classic phosphor green
          dim: '#1a8f1a',         // dimmed green
          glow: '#66ff66',
          bg: '#0a0a0a',
          bgAlt: '#111111',
        },
      },
      fontFamily: {
        mono: ['"IBM Plex Mono"', '"Courier New"', 'monospace'],
      },
      animation: {
        'flicker': 'flicker 3s infinite',
        'scanline': 'scanline 8s linear infinite',
        'blink': 'blink 1s step-end infinite',
        'typing': 'typing 2s steps(40) forwards',
      },
      keyframes: {
        flicker: {
          '0%, 100%': { opacity: '1' },
          '92%': { opacity: '1' },
          '93%': { opacity: '0.8' },
          '94%': { opacity: '1' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        typing: {
          from: { width: '0' },
          to: { width: '100%' },
        },
      },
    },
  },
  plugins: [],
};
