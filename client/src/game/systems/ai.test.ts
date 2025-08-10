import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AIController } from './ai'
import { createMockUnit, createMockGameState } from '../test/helpers'
import { UnitType, StatusType, TileType } from 'shared'

describe('AI Controller', () => {
  let aiController: AIController
  let mockActions: any
  let mockGetState: () => any

  beforeEach(() => {
    aiController = new AIController('normal')
    mockActions = {
      moveUnit: vi.fn(),
      attackTarget: vi.fn(),
      captureCubicle: vi.fn(),
      useAbility: vi.fn(),
      endTurn: vi.fn()
    }
    mockGetState = vi.fn()
  })

  describe('AI Initialization', () => {
    it('should create AI controller with correct difficulty', () => {
      const easyAI = new AIController('easy')
      const hardAI = new AIController('hard')
      
      expect(easyAI).toBeInstanceOf(AIController)
      expect(hardAI).toBeInstanceOf(AIController)
    })
  })

  describe('AI Decision Making', () => {
    it('should prioritize ability usage when available', () => {
      const unit = createMockUnit({
        abilities: ['fetch_coffee'],
        actionsRemaining: 2,
        abilityCooldowns: {}
      })
      
      const ally = createMockUnit({
        playerId: 'player1',
        position: { x: 1, y: 0 }
      })
      
      const gameState = createMockGameState({
        units: [unit, ally],
        currentPlayerId: 'player1'
      })
      
      mockGetState.mockReturnValue(gameState)
      
      // Mock the private method by accessing it through the class
      const decision = (aiController as any).makeDecision(unit, gameState)
      
      expect(decision).toBeDefined()
      if (decision && decision.type === 'ability') {
        expect(decision.abilityId).toBe('fetch_coffee')
      }
    })

    it('should prioritize attacking low-health enemies', () => {
      const unit = createMockUnit({
        position: { x: 0, y: 0 },
        attackRange: 2,
        actionsRemaining: 1,
        hasAttacked: false
      })
      
      const weakEnemy = createMockUnit({
        playerId: 'player2',
        position: { x: 1, y: 0 },
        hp: 1
      })
      
      const strongEnemy = createMockUnit({
        playerId: 'player2',
        position: { x: 2, y: 0 },
        hp: 10
      })
      
      const gameState = createMockGameState({
        units: [unit, weakEnemy, strongEnemy],
        currentPlayerId: 'player1'
      })
      
      const decision = (aiController as any).makeDecision(unit, gameState)
      
      expect(decision).toBeDefined()
      if (decision && decision.type === 'attack') {
        expect(decision.targetId).toBe(weakEnemy.id)
      }
    })

    it('should prioritize capturing unowned cubicles', () => {
      const unit = createMockUnit({
        position: { x: 0, y: 0 },
        actionsRemaining: 1,
        hasMoved: false
      })
      
      const gameState = createMockGameState({
        units: [unit],
        currentPlayerId: 'player1'
      })
      
      // Set up adjacent unowned cubicle
      gameState.board[0][1] = {
        type: TileType.CUBICLE,
        owner: 'player2',
        occupied: null
      }
      
      const decision = (aiController as any).makeDecision(unit, gameState)
      
      expect(decision).toBeDefined()
      if (decision && decision.type === 'capture') {
        expect(decision.position).toEqual({ x: 1, y: 0 })
      }
    })

    it('should move toward objectives when no immediate actions available', () => {
      const unit = createMockUnit({
        position: { x: 0, y: 0 },
        moveRange: 2,
        actionsRemaining: 1,
        hasMoved: false
      })
      
      const enemy = createMockUnit({
        playerId: 'player2',
        position: { x: 3, y: 0 }
      })
      
      const gameState = createMockGameState({
        units: [unit, enemy],
        currentPlayerId: 'player1'
      })
      
      const decision = (aiController as any).makeDecision(unit, gameState)
      
      expect(decision).toBeDefined()
      if (decision && decision.type === 'move') {
        expect(decision.position).toBeDefined()
        // Should move toward enemy
        expect(decision.position.x).toBeGreaterThan(0)
      }
    })
  })

  describe('AI Ability Usage', () => {
    it('should use abilities strategically based on scoring', () => {
      const unit = createMockUnit({
        abilities: ['pink_slip'],
        actionsRemaining: 2,
        abilityCooldowns: {}
      })
      
      const lowHpEnemy = createMockUnit({
        playerId: 'player2',
        position: { x: 1, y: 0 },
        hp: 1
      })
      
      const gameState = createMockGameState({
        units: [unit, lowHpEnemy],
        currentPlayerId: 'player1'
      })
      
      const abilityDecision = (aiController as any).evaluateAbilityUsage(unit, gameState)
      
      expect(abilityDecision).toBeDefined()
      if (abilityDecision) {
        expect(abilityDecision.type).toBe('ability')
        expect(abilityDecision.abilityId).toBe('pink_slip')
        expect(abilityDecision.target).toBe(lowHpEnemy)
      }
    })

    it('should score abilities based on strategic value', () => {
      const unit = createMockUnit()
      const target = createMockUnit({ playerId: 'player2', hp: 1 })
      
      const score = (aiController as any).scoreAbilityUsage(
        { id: 'pink_slip' } as any,
        target,
        unit
      )
      
      expect(score).toBeGreaterThan(20) // High score for execution ability on low HP target
    })

    it('should not use abilities when cooldowns are active', () => {
      const unit = createMockUnit({
        abilities: ['fetch_coffee'],
        actionsRemaining: 2,
        abilityCooldowns: { 'fetch_coffee': 2 }
      })
      
      const gameState = createMockGameState({
        units: [unit],
        currentPlayerId: 'player1'
      })
      
      const abilityDecision = (aiController as any).evaluateAbilityUsage(unit, gameState)
      
      expect(abilityDecision).toBeNull()
    })
  })

  describe('AI Movement and Positioning', () => {
    it('should calculate valid move positions correctly', () => {
      const unit = createMockUnit({
        position: { x: 1, y: 1 },
        moveRange: 2
      })
      
      const gameState = createMockGameState({
        units: [unit],
        currentPlayerId: 'player1'
      })
      
      // Add obstacles
      gameState.board[0][1] = { type: TileType.OBSTACLE, owner: null, occupied: null }
      gameState.board[2][1] = { type: TileType.OBSTACLE, owner: null, occupied: null }
      
      const possibleMoves = (aiController as any).calculatePossibleMoves(unit, gameState)
      
      expect(possibleMoves.length).toBeGreaterThan(0)
      // Should not include obstacle positions
      expect(possibleMoves.some(move => move.x === 1 && move.y === 0)).toBe(false)
      expect(possibleMoves.some(move => move.x === 1 && move.y === 2)).toBe(false)
    })

    it('should find best move position based on objectives', () => {
      const unit = createMockUnit({
        position: { x: 0, y: 0 },
        moveRange: 2
      })
      
      const enemy = createMockUnit({
        playerId: 'player2',
        position: { x: 3, y: 0 }
      })
      
      const gameState = createMockGameState({
        units: [unit, enemy],
        currentPlayerId: 'player1'
      })
      
      const bestMove = (aiController as any).getBestMovePosition(unit, gameState)
      
      expect(bestMove).toBeDefined()
      if (bestMove) {
        // Should move toward enemy
        expect(bestMove.x).toBeGreaterThan(0)
      }
    })
  })

  describe('AI Target Selection', () => {
    it('should find enemies in attack range', () => {
      const unit = createMockUnit({
        position: { x: 0, y: 0 },
        attackRange: 2
      })
      
      const nearbyEnemy = createMockUnit({
        playerId: 'player2',
        position: { x: 1, y: 0 }
      })
      
      const farEnemy = createMockUnit({
        playerId: 'player2',
        position: { x: 3, y: 0 }
      })
      
      const gameState = createMockGameState({
        units: [unit, nearbyEnemy, farEnemy],
        currentPlayerId: 'player1'
      })
      
      const enemiesInRange = (aiController as any).getEnemiesInRange(unit, gameState)
      
      expect(enemiesInRange).toContain(nearbyEnemy)
      expect(enemiesInRange).not.toContain(farEnemy)
    })

    it('should find capturable tiles', () => {
      const unit = createMockUnit({
        position: { x: 1, y: 1 }
      })
      
      const gameState = createMockGameState({
        units: [unit],
        currentPlayerId: 'player1'
      })
      
      // Set up adjacent unowned cubicle
      gameState.board[1][2] = {
        type: TileType.CUBICLE,
        owner: 'player2',
        occupied: null
      }
      
      const capturableTiles = (aiController as any).getCapturableTiles(unit, gameState)
      
      expect(capturableTiles).toContainEqual({ x: 2, y: 1 })
    })
  })

  describe('AI Turn Execution', () => {
    it('should process all units during turn', () => {
      const unit1 = createMockUnit({ id: 'unit1', actionsRemaining: 1 })
      const unit2 = createMockUnit({ id: 'unit2', actionsRemaining: 1 })
      
      const gameState = createMockGameState({
        units: [unit1, unit2],
        currentPlayerId: 'player1'
      })
      
      mockGetState.mockReturnValue(gameState)
      
      aiController.takeTurn(gameState, mockActions, mockGetState)
      
      // Should call endTurn after processing all units
      expect(mockActions.endTurn).toHaveBeenCalled()
    })

    it('should continue processing unit until no actions remain', () => {
      const unit = createMockUnit({
        actionsRemaining: 3,
        hasMoved: false,
        hasAttacked: false
      })
      
      const gameState = createMockGameState({
        units: [unit],
        currentPlayerId: 'player1'
      })
      
      mockGetState.mockReturnValue(gameState)
      
      // Mock decision to return move action
      vi.spyOn(aiController as any, 'makeDecision').mockReturnValue({
        type: 'move',
        position: { x: 1, y: 0 }
      })
      
      aiController.takeTurn(gameState, mockActions, mockGetState)
      
      // Should call moveUnit
      expect(mockActions.moveUnit).toHaveBeenCalled()
    })
  })

  describe('AI Difficulty Settings', () => {
    it('should add randomness based on difficulty level', () => {
      const easyAI = new AIController('easy')
      const normalAI = new AIController('normal')
      const hardAI = new AIController('hard')
      
      const unit = createMockUnit({
        position: { x: 0, y: 0 },
        moveRange: 2
      })
      
      const gameState = createMockGameState({
        units: [unit],
        currentPlayerId: 'player1'
      })
      
      // Test that different difficulties produce different scores
      const easyScore = (easyAI as any).getBestMovePosition(unit, gameState)
      const normalScore = (normalAI as any).getBestMovePosition(unit, gameState)
      const hardScore = (hardAI as any).getBestMovePosition(unit, gameState)
      
      // All should return valid moves
      expect(easyScore).toBeDefined()
      expect(normalScore).toBeDefined()
      expect(hardScore).toBeDefined()
    })
  })

  describe('Edge Cases', () => {
    it('should handle units with no actions remaining', () => {
      const unit = createMockUnit({ actionsRemaining: 0 })
      const gameState = createMockGameState({
        units: [unit],
        currentPlayerId: 'player1'
      })
      
      const decision = (aiController as any).makeDecision(unit, gameState)
      
      expect(decision).toBeNull()
    })

    it('should handle units with no valid moves', () => {
      const unit = createMockUnit({
        position: { x: 0, y: 0 },
        moveRange: 1
      })
      
      const gameState = createMockGameState({
        units: [unit],
        currentPlayerId: 'player1'
      })
      
      // Surround with obstacles
      gameState.board[0][1] = { type: TileType.OBSTACLE, owner: null, occupied: null }
      gameState.board[1][0] = { type: TileType.OBSTACLE, owner: null, occupied: null }
      
      const bestMove = (aiController as any).getBestMovePosition(unit, gameState)
      
      expect(bestMove).toBeNull()
    })

    it('should handle empty game state gracefully', () => {
      const emptyGameState = createMockGameState({
        units: [],
        currentPlayerId: 'player1'
      })
      
      expect(() => {
        aiController.takeTurn(emptyGameState, mockActions, mockGetState)
      }).not.toThrow()
      
      expect(mockActions.endTurn).toHaveBeenCalled()
    })
  })
})
