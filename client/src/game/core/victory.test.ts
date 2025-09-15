import { describe, it, expect, beforeEach } from 'vitest'
import { 
  checkVictoryConditions, 
  getCubicleData, 
  getCapturePointStats, 
  getValuableCapturePoints 
} from './victory'
import { createMockUnit, createMockGameState } from '../test/helpers'
import { TileType, GamePhase, type GameState, type Tile } from 'shared'

describe('Victory System', () => {
  let mockGameState: GameState
  let mockBoard: Tile[][]

  beforeEach(() => {
    mockGameState = createMockGameState()
    mockBoard = mockGameState.board
  })

  describe('checkVictoryConditions', () => {
    it('should declare Player 1 the winner if all Player 2 units are eliminated', () => {
      const player1Units = [
        createMockUnit({ id: 'p1_unit1', playerId: 'player1' }),
        createMockUnit({ id: 'p1_unit2', playerId: 'player1' })
      ]
      
      // No player2 units
      const units = player1Units
      const players = [
        { id: 'player1', controlledCubicles: 0 },
        { id: 'player2', controlledCubicles: 0 }
      ]

      const result = checkVictoryConditions({ units, board: mockBoard, players, phase: GamePhase.PLAYING })

      expect(result.winner).toBe('player1')
      expect(result.reason).toBe('elimination')
    })

    it('should declare Player 2 the winner if they control over 51% of the cubicles', () => {
      const units = [
        createMockUnit({ id: 'p1_unit1', playerId: 'player1' }),
        createMockUnit({ id: 'p2_unit1', playerId: 'player2' })
      ]
      
      // Create a board with 10 cubicles, player2 controls 6 (60%)
      const boardWithCubicles = Array(10).fill(null).map((_, y) => 
        Array(10).fill(null).map((_, x) => {
          if (x < 6 && y === 0) return { type: TileType.CUBICLE, x, y, owner: 'player2' }
          if (x >= 6 && y === 0) return { type: TileType.CUBICLE, x, y, owner: 'player1' }
          return { type: TileType.NORMAL, x, y, owner: undefined }
        })
      )
      
      const players = [
        { id: 'player1', controlledCubicles: 4 },
        { id: 'player2', controlledCubicles: 6 }
      ]

      const result = checkVictoryConditions({ units, board: boardWithCubicles, players, phase: GamePhase.PLAYING })

      expect(result.winner).toBe('player2')
      expect(result.reason).toBe('capture_points')
    })

    it('should return no winner if neither condition is met', () => {
      const units = [
        createMockUnit({ id: 'p1_unit1', playerId: 'player1' }),
        createMockUnit({ id: 'p2_unit1', playerId: 'player2' })
      ]
      
      const players = [
        { id: 'player1', controlledCubicles: 5 },
        { id: 'player2', controlledCubicles: 5 }
      ]

      const result = checkVictoryConditions({ units, board: mockBoard, players, phase: GamePhase.PLAYING })

      expect(result.winner).toBe(null)
      expect(result.reason).toBe(null)
    })

    it('should handle edge case of exactly 50% cubicle control', () => {
      const units = [
        createMockUnit({ id: 'p1_unit1', playerId: 'player1' }),
        createMockUnit({ id: 'p2_unit1', playerId: 'player2' })
      ]
      
      const players = [
        { id: 'player1', controlledCubicles: 5 },
        { id: 'player2', controlledCubicles: 5 }
      ]

      const result = checkVictoryConditions({ units, board: mockBoard, players, phase: GamePhase.PLAYING })

      expect(result.winner).toBe(null)
      expect(result.reason).toBe(null)
    })
  })

  describe('getCubicleData', () => {
    it('should extract capture point information from board', () => {
      const boardWithCubicles = Array(5).fill(null).map((_, y) => 
        Array(5).fill(null).map((_, x) => {
          if (x === 0 && y === 0) return { type: TileType.CUBICLE, x, y, owner: 'player1' }
          if (x === 1 && y === 0) return { type: TileType.CUBICLE, x, y, owner: 'player2' }
          if (x === 2 && y === 0) return { type: TileType.CUBICLE, x, y, owner: undefined }
          return { type: TileType.NORMAL, x, y, owner: undefined }
        })
      )

      const result = getCubicleData(boardWithCubicles)

      expect(result.totalCubicles).toBe(3)
      expect(result.count).toBe(3)
      expect(result.positions).toHaveLength(3)
    })

    it('should handle board with no cubicles', () => {
      const result = getCubicleData(mockBoard)

      expect(result.totalCubicles).toBe(0)
      expect(result.count).toBe(0)
      expect(result.positions).toHaveLength(0)
    })
  })

  describe('getCapturePointStats', () => {
    it('should return detailed victory statistics', () => {
      const boardWithCubicles = Array(5).fill(null).map((_, y) => 
        Array(5).fill(null).map((_, x) => {
          if (x === 0 && y === 0) return { type: TileType.CUBICLE, x, y, owner: 'player1' }
          if (x === 1 && y === 0) return { type: TileType.CUBICLE, x, y, owner: 'player2' }
          if (x === 2 && y === 0) return { type: TileType.CUBICLE, x, y, owner: undefined }
          return { type: TileType.NORMAL, x, y, owner: undefined }
        })
      )

      const players = [
        { id: 'player1', controlledCubicles: 1 },
        { id: 'player2', controlledCubicles: 1 }
      ]

      const result = getCapturePointStats({ units: [], board: boardWithCubicles, players, phase: GamePhase.PLAYING })

      expect(result.totalCapturePoints).toBe(3)
      expect(result.player1Percentage).toBeCloseTo(33.33, 1)
      expect(result.player2Percentage).toBeCloseTo(33.33, 1)
      expect(result.unclaimed).toBe(1)
      expect(result.victoryThreshold).toBe(2) // Need 2 more to reach 51%
    })
  })

  describe('getValuableCapturePoints', () => {
    it('should find strategic positions for AI targeting', () => {
      const boardWithCubicles = Array(5).fill(null).map((_, y) => 
        Array(5).fill(null).map((_, x) => {
          if (x === 0 && y === 0) return { type: TileType.CUBICLE, x, y, owner: 'player1' }
          if (x === 1 && y === 0) return { type: TileType.CUBICLE, x, y, owner: 'player2' }
          if (x === 2 && y === 0) return { type: TileType.CUBICLE, x, y, owner: undefined }
          return { type: TileType.NORMAL, x, y, owner: undefined }
        })
      )

      const result = getValuableCapturePoints({ units: [], board: boardWithCubicles, players: [], phase: GamePhase.PLAYING }, 'player1')

      // Should prioritize neutral and enemy-controlled cubicles
      expect(result).toContainEqual({ x: 2, y: 0 }) // Neutral
      expect(result).toContainEqual({ x: 1, y: 0 }) // Enemy-controlled
      expect(result).not.toContainEqual({ x: 0, y: 0 }) // Own cubicle
    })

    it('should return empty array if no valuable targets', () => {
      const boardWithOwnCubicles = Array(5).fill(null).map((_, y) => 
        Array(5).fill(null).map((_, x) => {
          if (x === 0 && y === 0) return { type: TileType.CUBICLE, x, y, owner: 'player1' }
          if (x === 1 && y === 0) return { type: TileType.CUBICLE, x, y, owner: 'player1' }
          return { type: TileType.NORMAL, x, y, owner: undefined }
        })
      )

      const result = getValuableCapturePoints({ units: [], board: boardWithOwnCubicles, players: [], phase: GamePhase.PLAYING }, 'player1')

      expect(result).toHaveLength(0)
    })
  })
})
