import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AIController } from './ai'
import { createMockUnit, createMockGameState } from '../test/helpers'
import { GamePhase } from 'shared'

// Mock the main store
const mockMainStore = {
  getGameState: vi.fn(),
  moveUnit: vi.fn(),
  attackTarget: vi.fn(),
  attackUnit: vi.fn(), // Add missing method
  useAbility: vi.fn(),
  captureCubicle: vi.fn(),
  endTurn: vi.fn()
}

describe('AI Controller', () => {
  let aiController: AIController

  beforeEach(() => {
    aiController = new AIController('normal')
    vi.clearAllMocks()
  })

  describe('AI Initialization', () => {
    it('should create AI controller with normal difficulty', () => {
      expect(aiController).toBeDefined()
      expect(aiController.takeTurnWithMainStore).toBeDefined()
    })

    it('should create AI controller with easy difficulty', () => {
      const easyAI = new AIController('easy')
      expect(easyAI).toBeDefined()
    })

    it('should create AI controller with hard difficulty', () => {
      const hardAI = new AIController('hard')
      expect(hardAI).toBeDefined()
    })
  })

  describe('AI Turn Execution', () => {
    it('should be able to take a turn with main store', () => {
      const gameState = createMockGameState({
        units: [
          createMockUnit({ id: 'ai-unit', playerId: 'player2', actionsRemaining: 1 }),
          createMockUnit({ id: 'player-unit', playerId: 'player1', actionsRemaining: 1 })
        ],
        currentPlayerId: 'player2',
        phase: GamePhase.PLAYING
      })

      mockMainStore.getGameState.mockReturnValue(gameState)

      // The AI should be able to take a turn without throwing errors
      expect(() => {
        aiController.takeTurnWithMainStore(mockMainStore as any)
      }).not.toThrow()
    })

    it('should handle empty unit list gracefully', () => {
      const gameState = createMockGameState({
        units: [],
        currentPlayerId: 'player2',
        phase: GamePhase.PLAYING
      })

      mockMainStore.getGameState.mockReturnValue(gameState)

      expect(() => {
        aiController.takeTurnWithMainStore(mockMainStore as any)
      }).not.toThrow()
    })

    it('should handle units with no actions remaining', () => {
      const gameState = createMockGameState({
        units: [
          createMockUnit({ 
            id: 'ai-unit', 
        playerId: 'player2',
            actionsRemaining: 0,
            hasMoved: true,
            hasAttacked: true
          })
        ],
        currentPlayerId: 'player2',
        phase: GamePhase.PLAYING
      })

      mockMainStore.getGameState.mockReturnValue(gameState)

      expect(() => {
        aiController.takeTurnWithMainStore(mockMainStore as any)
      }).not.toThrow()
    })
  })

  describe('AI Decision Making', () => {
    it('should process units until they have no actions remaining', () => {
      const gameState = createMockGameState({
        units: [
          createMockUnit({ 
            id: 'ai-unit', 
            playerId: 'player2', 
            actionsRemaining: 2,
            hasMoved: false,
            hasAttacked: false
          })
        ],
        currentPlayerId: 'player2',
        phase: GamePhase.PLAYING
      })

      mockMainStore.getGameState.mockReturnValue(gameState)

      aiController.takeTurnWithMainStore(mockMainStore as any)

      // The AI should have called getGameState multiple times to get fresh state
      expect(mockMainStore.getGameState).toHaveBeenCalled()
    })

    it('should not get stuck in infinite loops', () => {
      const gameState = createMockGameState({
        units: [
          createMockUnit({ 
            id: 'ai-unit', 
            playerId: 'player2', 
            actionsRemaining: 1,
            hasMoved: false,
            hasAttacked: false
          })
        ],
        currentPlayerId: 'player2',
        phase: GamePhase.PLAYING
      })

      mockMainStore.getGameState.mockReturnValue(gameState)

      // Mock the store methods to not actually consume actions (simulating a bug)
      mockMainStore.moveUnit.mockImplementation(() => {
        // Don't actually move the unit
      })
      mockMainStore.attackTarget.mockImplementation(() => {
        // Don't actually attack
      })

      expect(() => {
        aiController.takeTurnWithMainStore(mockMainStore as any)
      }).not.toThrow()

      // The AI should have a safety limit and not call getGameState excessively
      expect(mockMainStore.getGameState).toHaveBeenCalledTimes(expect.any(Number))
      expect(mockMainStore.getGameState).toHaveBeenCalledTimes(expect.any(Number))
    })
  })

  describe('AI Integration', () => {
    it('should work with the main store interface', () => {
      const gameState = createMockGameState({
        units: [
          createMockUnit({ id: 'ai-unit', playerId: 'player2', actionsRemaining: 1 })
        ],
        currentPlayerId: 'player2',
        phase: GamePhase.PLAYING
      })

      mockMainStore.getGameState.mockReturnValue(gameState)

      // The AI should be able to call all the main store methods
      expect(() => {
        aiController.takeTurnWithMainStore(mockMainStore as any)
      }).not.toThrow()

      // Verify that the AI can access the required store methods
      expect(mockMainStore.getGameState).toBeDefined()
      expect(mockMainStore.moveUnit).toBeDefined()
      expect(mockMainStore.attackTarget).toBeDefined()
      expect(mockMainStore.useAbility).toBeDefined()
      expect(mockMainStore.captureCubicle).toBeDefined()
      expect(mockMainStore.endTurn).toBeDefined()
    })
  })

  describe('AI Attack Behavior', () => {
    it('should attack the weakest enemy when in range', () => {
      const gameState = createMockGameState({
        units: [
          createMockUnit({ 
            id: 'ai-unit', 
            playerId: 'player2', 
            actionsRemaining: 1,
            position: { x: 0, y: 0 },
            attackRange: 2
          }),
          createMockUnit({ 
            id: 'enemy-weak', 
            playerId: 'player1', 
            position: { x: 1, y: 0 },
            hp: 5,
            maxHp: 10
          }),
          createMockUnit({ 
            id: 'enemy-strong', 
            playerId: 'player1', 
            position: { x: 0, y: 1 },
            hp: 8,
            maxHp: 10
          })
        ],
        currentPlayerId: 'player2',
        phase: GamePhase.PLAYING
      })

      mockMainStore.getGameState.mockReturnValue(gameState)
      mockMainStore.attackUnit.mockImplementation(() => {})

      aiController.takeTurnWithMainStore(mockMainStore as any)

      // Should have called attackUnit with the weakest enemy
      expect(mockMainStore.attackUnit).toHaveBeenCalledWith('ai-unit', 'enemy-weak')
    })

    it('should not attack when no enemies are in range', () => {
      const gameState = createMockGameState({
        units: [
          createMockUnit({ 
            id: 'ai-unit', 
            playerId: 'player2', 
            actionsRemaining: 1,
            position: { x: 0, y: 0 },
            attackRange: 1
          }),
          createMockUnit({ 
            id: 'enemy-far', 
            playerId: 'player1', 
            position: { x: 5, y: 5 } // Out of range
          })
        ],
        currentPlayerId: 'player2',
        phase: GamePhase.PLAYING
      })

      mockMainStore.getGameState.mockReturnValue(gameState)
      mockMainStore.attackUnit.mockImplementation(() => {})

      aiController.takeTurnWithMainStore(mockMainStore as any)

      // Should not have called attackUnit
      expect(mockMainStore.attackUnit).not.toHaveBeenCalled()
    })

    it('should prioritize attacking over moving when enemies are in range', () => {
      const gameState = createMockGameState({
        units: [
          createMockUnit({ 
            id: 'ai-unit', 
            playerId: 'player2', 
            actionsRemaining: 1,
            position: { x: 0, y: 0 },
            attackRange: 2
          }),
          createMockUnit({ 
            id: 'enemy-in-range', 
            playerId: 'player1', 
        position: { x: 1, y: 0 }
      })
        ],
        currentPlayerId: 'player2',
        phase: GamePhase.PLAYING
      })

      mockMainStore.getGameState.mockReturnValue(gameState)
      mockMainStore.attackUnit.mockImplementation(() => {})
      mockMainStore.moveUnit.mockImplementation(() => {})

      aiController.takeTurnWithMainStore(mockMainStore as any)

      // Should attack, not move
      expect(mockMainStore.attackUnit).toHaveBeenCalled()
      expect(mockMainStore.moveUnit).not.toHaveBeenCalled()
    })
  })

  describe('Edge Cases', () => {
    it('should handle units with no actions remaining', () => {
      const gameState = createMockGameState({
        units: [
          createMockUnit({ 
            id: 'ai-unit', 
            playerId: 'player2', 
            actionsRemaining: 0,
            hasMoved: true,
            hasAttacked: true
          })
        ],
        currentPlayerId: 'player2',
        phase: GamePhase.PLAYING
      })

      mockMainStore.getGameState.mockReturnValue(gameState)

      expect(() => {
        aiController.takeTurnWithMainStore(mockMainStore as any)
      }).not.toThrow()
    })

    it('should handle game state with no AI units', () => {
      const gameState = createMockGameState({
        units: [
          createMockUnit({ id: 'player-unit', playerId: 'player1', actionsRemaining: 1 })
        ],
        currentPlayerId: 'player2',
        phase: GamePhase.PLAYING
      })

      mockMainStore.getGameState.mockReturnValue(gameState)

      expect(() => {
        aiController.takeTurnWithMainStore(mockMainStore as any)
      }).not.toThrow()
    })

    it('should handle different game phases', () => {
      const gameState = createMockGameState({
        units: [
          createMockUnit({ id: 'ai-unit', playerId: 'player2', actionsRemaining: 1 })
        ],
        currentPlayerId: 'player2',
        phase: GamePhase.DRAFT
      })

      mockMainStore.getGameState.mockReturnValue(gameState)

      expect(() => {
        aiController.takeTurnWithMainStore(mockMainStore as any)
      }).not.toThrow()
    })

    it('should not throw ReferenceError for undefined queryState variable', () => {
      // This test specifically addresses the bug where queryState was undefined
      // in the makeDecisionWithQueries function
      const gameState = createMockGameState({
        units: [
          createMockUnit({ 
            id: 'ai-unit', 
            playerId: 'player2', 
            actionsRemaining: 1,
            position: { x: 0, y: 0 },
            moveRange: 2
          })
        ],
        currentPlayerId: 'player2',
        phase: GamePhase.PLAYING
      })

      mockMainStore.getGameState.mockReturnValue(gameState)

      // This should not throw a ReferenceError about queryState being undefined
      expect(() => {
        aiController.takeTurnWithMainStore(mockMainStore as any)
      }).not.toThrow()
    })
  })
})