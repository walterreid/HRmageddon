// ===== UI CONFIGURATION =====
export const UI_CONFIG = {
  // Menu Positioning
  MENU: {
    WIDTH: 350,
    HEIGHT: 400,
    OFFSET_X: 50,
    OFFSET_Y: 50,
    MIN_MARGIN: 20,
  },
  // Colors (Tailwind-style for easy swapping)
  COLORS: {
    BACKGROUND: 'bg-stone-100',
    BORDER: 'border-stone-300',
    TEXT: {
      PRIMARY: 'text-stone-800',
      SECONDARY: 'text-stone-600',
      WARNING: 'text-amber-600',
      ERROR: 'text-red-600',
      SUCCESS: 'text-green-600',
      ACCENT: 'text-amber-600',
    },
    BUTTONS: {
      MOVE: {
        AVAILABLE: 'bg-stone-600 hover:bg-stone-700 border-stone-500 text-white',
        DISABLED: 'bg-stone-200 border-stone-300 text-stone-400',
      },
      ATTACK: {
        AVAILABLE: 'bg-red-600 hover:bg-red-700 border-red-500 text-white',
        DISABLED: 'bg-stone-200 border-stone-300 text-stone-400',
      },
      ABILITY: {
        AVAILABLE: 'bg-amber-600 hover:bg-amber-700 border-amber-500 text-white',
        DISABLED: 'bg-stone-200 border-stone-300 text-stone-400',
      },
      CLOSE: 'bg-stone-500 hover:bg-stone-600 border-stone-400 text-white',
    },
    STATUS_BADGES: {
      READY: 'bg-green-600 text-white',
      UNAVAILABLE: 'bg-red-600 text-white',
    }
  },
  // Text Content
  TEXT: {
    HEADERS: {
      ACTIONS: 'Actions',
      ACTION_MODE_WARNING: '🎯 Action mode active - complete your action before selecting other units',
    },
    BUTTONS: {
      MOVE: 'Move Employee',
      ATTACK: 'Attack',
      CLOSE: 'Close',
    },
    STATUS: {
      READY: 'READY',
      UNAVAILABLE: 'UNAVAILABLE',
    }
  },
  // Animation & Timing
  ANIMATION: {
    BUTTON_PRESS_SCALE: 0.95,
    BUTTON_PRESS_DURATION: 150,
    TRANSITION_DURATION: 'duration-200',
  }
}
// ===== END CONFIGURATION =====
