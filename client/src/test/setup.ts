// Test setup file for Vitest
import { vi } from 'vitest'

// Mock Phaser for tests
vi.mock('phaser', () => ({
  default: {
    Game: vi.fn(),
    Scene: vi.fn(),
    GameObjects: {
      Rectangle: vi.fn(),
      Text: vi.fn(),
      Image: vi.fn(),
      Sprite: vi.fn(),
      Container: vi.fn()
    },
    Input: {
      Keyboard: {
        KeyCodes: {
          SPACE: 32,
          ENTER: 13,
          ESC: 27
        }
      }
    },
    Scale: {
      FIT: 'FIT',
      RESIZE: 'RESIZE'
    }
  }
}))

// Mock React components that might cause issues in tests
vi.mock('react', async () => {
  const actual = await vi.importActual('react')
  return {
    ...actual,
    useEffect: vi.fn(),
    useState: vi.fn(),
    useCallback: vi.fn(),
    useMemo: vi.fn()
  }
})

// Global test utilities
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})
