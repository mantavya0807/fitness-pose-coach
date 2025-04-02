// src/styles/theme.js
// This file establishes a more vibrant color system and animation constants

export const colors = {
    // Primary palette - more vibrant blues
    primary: {
      50: '#e3f2fd',
      100: '#bbdefb',
      200: '#90caf9',
      300: '#64b5f6',
      400: '#42a5f5',
      500: '#2196f3', // Base primary color
      600: '#1e88e5',
      700: '#1976d2',
      800: '#1565c0',
      900: '#0d47a1',
    },
    
    // Secondary palette - energetic purples/pinks
    secondary: {
      50: '#f3e5f5',
      100: '#e1bee7',
      200: '#ce93d8',
      300: '#ba68c8',
      400: '#ab47bc',
      500: '#9c27b0', // Base secondary color
      600: '#8e24aa',
      700: '#7b1fa2',
      800: '#6a1b9a',
      900: '#4a148c',
    },
    
    // Accent colors
    accent: {
      green: {
        light: '#4ade80',
        base: '#22c55e',
        dark: '#16a34a'
      },
      orange: {
        light: '#fb923c',
        base: '#f97316',
        dark: '#ea580c'
      },
      teal: {
        light: '#2dd4bf',
        base: '#14b8a6',
        dark: '#0d9488'
      },
      red: {
        light: '#f87171',
        base: '#ef4444',
        dark: '#dc2626'
      }
    },
    
    // Better grays (less industrial, warmer)
    gray: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#e5e5e5',
      300: '#d4d4d4',
      400: '#a3a3a3',
      500: '#737373',
      600: '#525252',
      700: '#404040',
      800: '#262626',
      900: '#171717',
    },
    
    // Gradients
    gradients: {
      primary: 'linear-gradient(135deg, #2196f3 0%, #1565c0 100%)',
      secondary: 'linear-gradient(135deg, #9c27b0 0%, #6a1b9a 100%)',
      sunrise: 'linear-gradient(135deg, #ff7e5f 0%, #feb47b 100%)',
      sunset: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
      fresh: 'linear-gradient(135deg, #43cea2 0%, #185a9d 100%)',
      ocean: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      fitness: 'linear-gradient(135deg, #00c6fb 0%, #005bea 100%)'
    }
  };
  
  // Animation configurations
  export const animations = {
    // Transition durations
    duration: {
      fast: '150ms',
      normal: '250ms',
      slow: '350ms'
    },
    
    // Easing functions
    easing: {
      ease: 'cubic-bezier(0.25, 0.1, 0.25, 1.0)',
      easeIn: 'cubic-bezier(0.42, 0, 1.0, 1.0)',
      easeOut: 'cubic-bezier(0, 0, 0.58, 1.0)',
      easeInOut: 'cubic-bezier(0.42, 0, 0.58, 1.0)',
      spring: 'cubic-bezier(0.5, 0, 0.1, 1.4)'
    },
    
    // Keyframes
    keyframes: {
      fadeIn: `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `,
      slideUp: `
        @keyframes slideUp {
          from { transform: translateY(1rem); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `,
      pulse: `
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
      `,
      shimmer: `
        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }
      `
    }
  };
  
  // Shadows with better depth perception
  export const shadows = {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
    outline: '0 0 0 3px rgba(66, 153, 225, 0.5)',
    none: 'none'
  };
  
  // Border radius
  export const borderRadius = {
    none: '0',
    sm: '0.125rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    '2xl': '1rem',
    '3xl': '1.5rem',
    full: '9999px'
  };
  
  // Create a CSS reset and base styles
  export const globalStyles = `
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
  
    body {
      font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      background-color: ${colors.gray[100]};
      color: ${colors.gray[800]};
    }
  
    /* Animation classes */
    .fade-in {
      animation: fadeIn ${animations.duration.normal} ${animations.easing.ease} forwards;
    }
  
    .slide-up {
      animation: slideUp ${animations.duration.normal} ${animations.easing.easeOut} forwards;
    }
  
    .pulse {
      animation: pulse 2s ${animations.easing.easeInOut} infinite;
    }
  
    .shimmer {
      background: linear-gradient(to right, ${colors.gray[100]} 8%, ${colors.gray[200]} 18%, ${colors.gray[100]} 33%);
      background-size: 1000px 100%;
      animation: shimmer 1.5s infinite linear;
    }
  
    ${animations.keyframes.fadeIn}
    ${animations.keyframes.slideUp}
    ${animations.keyframes.pulse}
    ${animations.keyframes.shimmer}
  `;
  
  export default {
    colors,
    animations,
    shadows,
    borderRadius,
    globalStyles
  };