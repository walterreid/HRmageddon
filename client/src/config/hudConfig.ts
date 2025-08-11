// ===== HUD CONFIGURATION =====
export const HUD_CONFIG = {
  // Panel Positioning & Sizing
  PANELS: {
    STATUS: {
      POSITION: 'fixed top-4 left-4',
      WIDTH: 'w-80',
      MAX_HEIGHT: 'max-h-[calc(100vh-2rem)]',
    },
    UNIT_INFO: {
      POSITION: 'fixed top-4 right-4',
      WIDTH: 'w-80',
      MAX_HEIGHT: 'max-h-[calc(100vh-2rem)]',
    }
  },
  // Colors
  COLORS: {
    PANELS: {
      BACKGROUND: 'bg-stone-50/95',
      BORDER: 'border-stone-300',
      BACKDROP: 'backdrop-blur-sm',
    },
    TEXT: {
      PRIMARY: 'text-stone-800',
      SECONDARY: 'text-stone-600',
      ACCENT: 'text-amber-600',
      SUCCESS: 'text-green-600',
      WARNING: 'text-amber-600',
      ERROR: 'text-red-600',
    },
    TEAMS: {
      PLAYER1: {
        BACKGROUND: 'bg-amber-50/80',
        BORDER: 'border-amber-300',
        TEXT: 'text-amber-700',
      },
      PLAYER2: {
        BACKGROUND: 'bg-stone-100/80',
        BORDER: 'border-stone-300',
        TEXT: 'text-stone-700',
      }
    },
    BUTTONS: {
      END_TURN: 'bg-green-600 hover:bg-green-700 text-white',
      CANCEL: 'bg-stone-500 hover:bg-stone-600 text-white',
    },
    ACTION_MODES: {
      MOVE: {
        BACKGROUND: 'bg-stone-100/80',
        BORDER: 'border-stone-400',
        TEXT: 'text-stone-700',
      },
      ATTACK: {
        BACKGROUND: 'bg-red-50/80',
        BORDER: 'border-red-300',
        TEXT: 'text-red-700',
      },
      ABILITY: {
        BACKGROUND: 'bg-amber-50/80',
        BORDER: 'border-amber-300',
        TEXT: 'text-amber-700',
      }
    }
  },
  // Feedback Messages
  FEEDBACK: {
    DURATION: 2000, // ms
    POSITION: 'fixed top-20 left-1/2 transform -translate-x-1/2 z-50',
  },
  // Text Content
  TEXT: {
    TURN_INDICATOR: {
      YOUR_TURN: 'Your Turn (Gold)',
      AI_TURN: 'AI Turn (Navy)',
    },
    UNIT_STATUS: {
      CONTROLLING: '🎮 Controlling',
      VIEWING: '📖 Viewing Only',
    },
    ACTION_MODES: {
      MOVE: '🚶 Move Mode Active',
      ATTACK: '🎯 Attack Mode Active',
      ABILITY: '⚡ Ability Mode Active',
    }
  }
}
// ===== END CONFIGURATION =====
