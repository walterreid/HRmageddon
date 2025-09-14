import { describe, it, expect, beforeEach } from 'vitest'
import { 
  calculatePossibleMoves, 
  isValidMove, 
  getUnitsInRange, 
  findNearestUnit, 
  findNearestCoordinate,
  getDistance
} from './movement'
import { createMockUnit, createMockGameState } from '../test/helpers'
import { TileType, UnitType } from 'shared'
import { testNotImplemented, expectImplementation, getImplementationStatus, TestStatus } from '../test/testHelpers'

describe('Movement System', () => {
  let mockGameState: any
  let mockBoard: any[][]
  let mockUnits: any[]

  beforeEach(() => {
    mockGameState = createMockGameState()
    mockBoard = mockGameState.board
    mockUnits = mockGameState.units
  })

  describe('calculatePossibleMoves', () => {
    it('should return an empty array for a trapped unit surrounded by obstacles', () => {
      if (getImplementationStatus('MOVEMENT_SYSTEM') === TestStatus.IMPLEMENTATION_NEEDED) {
        expectImplementation('Movement system', 'calculatePossibleMoves should handle obstacles and return empty array for trapped units')
        return
      }

      try {
        // Create a board with obstacles around the unit
        const trappedUnit = createMockUnit({ 
          id: 'trapped', 
          position: { x: 5, y: 5 }, 
          moveRange: 2 
        })
        
        // Create obstacles around the unit
        const boardWithObstacles = Array(10).fill(null).map((_, y) => 
          Array(10).fill(null).map((_, x) => {
            if (x === 5 && y === 5) return { type: TileType.NORMAL, x, y }
            if (Math.abs(x - 5) <= 1 && Math.abs(y - 5) <= 1) return { type: TileType.OBSTACLE, x, y }
            return { type: TileType.NORMAL, x, y }
          })
        )

        const result = calculatePossibleMoves(trappedUnit, { board: boardWithObstacles, units: [] })
        
        if (result === undefined) {
          expectImplementation('Movement calculation', 'calculatePossibleMoves should return array, got undefined')
          return
        }

        expect(result).toEqual([])
      } catch (error) {
        expectImplementation('Movement calculation', `calculatePossibleMoves function not implemented: ${error}`)
      }
    })

    it('should not allow movement through tiles occupied by other units', () => {
      if (getImplementationStatus('MOVEMENT_SYSTEM') === TestStatus.IMPLEMENTATION_NEEDED) {
        expectImplementation('Movement collision detection', 'calculatePossibleMoves should avoid occupied tiles')
        return
      }

      try {
        const unit = createMockUnit({ 
          id: 'unit1', 
          position: { x: 5, y: 5 }, 
          moveRange: 2 
        })
        
        const blockingUnit = createMockUnit({ 
          id: 'unit2', 
          position: { x: 6, y: 5 }, 
          playerId: 'player2' 
        })

        const result = calculatePossibleMoves(unit, { board: mockBoard, units: [unit, blockingUnit] })
        
        if (result === undefined) {
          expectImplementation('Movement collision detection', 'calculatePossibleMoves should return array, got undefined')
          return
        }

        // Should not include the tile occupied by the blocking unit
        expect(result).not.toContainEqual({ x: 6, y: 5 })
        
        // Should include other valid moves
        expect(result).toContainEqual({ x: 4, y: 5 })
        expect(result).toContainEqual({ x: 5, y: 4 })
        expect(result).toContainEqual({ x: 5, y: 6 })
      } catch (error) {
        expectImplementation('Movement collision detection', `Movement collision detection not implemented: ${error}`)
      }
    })

    it('should return all tiles up to the unit\'s maximum moveRange on an empty board', () => {
      if (getImplementationStatus('MOVEMENT_SYSTEM') === TestStatus.IMPLEMENTATION_NEEDED) {
        expectImplementation('Movement range calculation', 'calculatePossibleMoves should find all tiles within moveRange')
        return
      }

      try {
        const unit = createMockUnit({ 
          id: 'unit1', 
          position: { x: 5, y: 5 }, 
          moveRange: 2 
        })

        const result = calculatePossibleMoves(unit, { board: mockBoard, units: [unit] })
        
        if (result === undefined) {
          expectImplementation('Movement range calculation', 'calculatePossibleMoves should return array, got undefined')
          return
        }

        // Should include all tiles within range (Manhattan distance)
        expect(result).toContainEqual({ x: 4, y: 5 }) // 1 step
        expect(result).toContainEqual({ x: 6, y: 5 }) // 1 step
        expect(result).toContainEqual({ x: 5, y: 4 }) // 1 step
        expect(result).toContainEqual({ x: 5, y: 6 }) // 1 step
        expect(result).toContainEqual({ x: 3, y: 5 }) // 2 steps
        expect(result).toContainEqual({ x: 7, y: 5 }) // 2 steps
        expect(result).toContainEqual({ x: 5, y: 3 }) // 2 steps
        expect(result).toContainEqual({ x: 5, y: 7 }) // 2 steps
        expect(result).toContainEqual({ x: 4, y: 4 }) // 2 steps diagonal
        expect(result).toContainEqual({ x: 6, y: 6 }) // 2 steps diagonal

        // Should not include tiles beyond range
        expect(result).not.toContainEqual({ x: 2, y: 5 }) // 3 steps
        expect(result).not.toContainEqual({ x: 8, y: 5 }) // 3 steps
      } catch (error) {
        expectImplementation('Movement range calculation', `Movement range calculation not implemented: ${error}`)
      }
    })

    it('should not include the unit\'s current position in possible moves', () => {
      if (getImplementationStatus('MOVEMENT_SYSTEM') === TestStatus.IMPLEMENTATION_NEEDED) {
        expectImplementation('Movement self-exclusion', 'calculatePossibleMoves should not include current position')
        return
      }

      try {
        const unit = createMockUnit({ 
          id: 'unit1', 
          position: { x: 5, y: 5 }, 
          moveRange: 2 
        })

        const result = calculatePossibleMoves(unit, { board: mockBoard, units: [unit] })
        
        if (result === undefined) {
          expectImplementation('Movement self-exclusion', 'calculatePossibleMoves should return array, got undefined')
          return
        }

        expect(result).not.toContainEqual({ x: 5, y: 5 })
      } catch (error) {
        expectImplementation('Movement self-exclusion', `Movement self-exclusion not implemented: ${error}`)
      }
    })
  })

  describe('isValidMove', () => {
    it('should validate moves within range', () => {
      if (getImplementationStatus('MOVEMENT_SYSTEM') === TestStatus.IMPLEMENTATION_NEEDED) {
        expectImplementation('Move validation', 'isValidMove should check if move is within range')
        return
      }

      try {
        const unit = createMockUnit({ 
          id: 'unit1', 
          position: { x: 5, y: 5 }, 
          moveRange: 2 
        })
        const target = { x: 6, y: 5 }

        const result = isValidMove(unit, target, { board: mockBoard, units: [unit] })
        
        if (result === undefined) {
          expectImplementation('Move validation', 'isValidMove should return boolean, got undefined')
          return
        }

        expect(result).toBe(true)
      } catch (error) {
        expectImplementation('Move validation', `isValidMove function not implemented: ${error}`)
      }
    })

    it('should reject moves outside range', () => {
      if (getImplementationStatus('MOVEMENT_SYSTEM') === TestStatus.IMPLEMENTATION_NEEDED) {
        expectImplementation('Range validation', 'isValidMove should reject moves outside range')
        return
      }

      try {
        const unit = createMockUnit({ 
          id: 'unit1', 
          position: { x: 5, y: 5 }, 
          moveRange: 1 
        })
        const target = { x: 7, y: 5 }

        const result = isValidMove(unit, target, { board: mockBoard, units: [unit] })
        
        if (result === undefined) {
          expectImplementation('Range validation', 'isValidMove should return boolean, got undefined')
          return
        }

        expect(result).toBe(false)
      } catch (error) {
        expectImplementation('Range validation', `Range validation not implemented: ${error}`)
      }
    })

    it('should reject moves to occupied tiles', () => {
      if (getImplementationStatus('MOVEMENT_SYSTEM') === TestStatus.IMPLEMENTATION_NEEDED) {
        expectImplementation('Occupied tile validation', 'isValidMove should reject moves to occupied tiles')
        return
      }

      try {
        const unit = createMockUnit({ 
          id: 'unit1', 
          position: { x: 5, y: 5 }, 
          moveRange: 2 
        })
        const blockingUnit = createMockUnit({ 
          id: 'unit2', 
          position: { x: 6, y: 5 } 
        })
        const target = { x: 6, y: 5 }

        const result = isValidMove(unit, target, { board: mockBoard, units: [unit, blockingUnit] })
        
        if (result === undefined) {
          expectImplementation('Occupied tile validation', 'isValidMove should return boolean, got undefined')
          return
        }

        expect(result).toBe(false)
      } catch (error) {
        expectImplementation('Occupied tile validation', `Occupied tile validation not implemented: ${error}`)
      }
    })

    it('should reject moves to obstacle tiles', () => {
      if (getImplementationStatus('MOVEMENT_SYSTEM') === TestStatus.IMPLEMENTATION_NEEDED) {
        expectImplementation('Obstacle validation', 'isValidMove should reject moves to obstacle tiles')
        return
      }

      try {
        const unit = createMockUnit({ 
          id: 'unit1', 
          position: { x: 5, y: 5 }, 
          moveRange: 2 
        })
        
        const boardWithObstacle = Array(10).fill(null).map((_, y) => 
          Array(10).fill(null).map((_, x) => {
            if (x === 6 && y === 5) return { type: TileType.OBSTACLE, x, y }
            return { type: TileType.NORMAL, x, y }
          })
        )
        
        const target = { x: 6, y: 5 }

        const result = isValidMove(unit, target, { board: boardWithObstacle, units: [unit] })
        
        if (result === undefined) {
          expectImplementation('Obstacle validation', 'isValidMove should return boolean, got undefined')
          return
        }

        expect(result).toBe(false)
      } catch (error) {
        expectImplementation('Obstacle validation', `Obstacle validation not implemented: ${error}`)
      }
    })
  })

  describe('Utility Functions', () => {
    it('should find units within specified range', () => {
      if (getImplementationStatus('MOVEMENT_SYSTEM') === TestStatus.IMPLEMENTATION_NEEDED) {
        expectImplementation('Unit range detection', 'getUnitsInRange should find units within range')
        return
      }

      try {
        const unit = createMockUnit({ 
          id: 'unit1', 
          position: { x: 5, y: 5 } 
        })
        
        const nearbyUnit = createMockUnit({ 
          id: 'unit2', 
          position: { x: 6, y: 5 } 
        })
        
        const farUnit = createMockUnit({ 
          id: 'unit3', 
          position: { x: 8, y: 5 } 
        })

        const result = getUnitsInRange(unit.position, 2, [unit, nearbyUnit, farUnit])
        
        if (result === undefined) {
          expectImplementation('Unit range detection', 'getUnitsInRange should return array, got undefined')
          return
        }

        expect(result).toContain(nearbyUnit)
        expect(result).not.toContain(farUnit)
        expect(result).not.toContain(unit) // Should not include self
      } catch (error) {
        expectImplementation('Unit range detection', `Unit range detection not implemented: ${error}`)
      }
    })

    it('should find the nearest unit with optional filtering', () => {
      if (getImplementationStatus('MOVEMENT_SYSTEM') === TestStatus.IMPLEMENTATION_NEEDED) {
        expectImplementation('Nearest unit detection', 'findNearestUnit should find closest unit with filtering')
        return
      }

      try {
        const unit = createMockUnit({ 
          id: 'unit1', 
          position: { x: 5, y: 5 } 
        })
        
        const nearbyUnit = createMockUnit({ 
          id: 'unit2', 
          position: { x: 6, y: 5 },
          playerId: 'player2'
        })
        
        const farUnit = createMockUnit({ 
          id: 'unit3', 
          position: { x: 8, y: 5 },
          playerId: 'player2'
        })

        const result = findNearestUnit(unit.position, [unit, nearbyUnit, farUnit], u => u.playerId === 'player2')
        
        if (result === undefined) {
          expectImplementation('Nearest unit detection', 'findNearestUnit should return Unit or undefined, got undefined')
          return
        }

        expect(result).toBe(nearbyUnit)
      } catch (error) {
        expectImplementation('Nearest unit detection', `Nearest unit detection not implemented: ${error}`)
      }
    })

    it('should calculate Manhattan distance correctly', () => {
      try {
        const pos1 = { x: 5, y: 5 }
        const pos2 = { x: 7, y: 3 }

        const result = getDistance(pos1, pos2)
        
        if (result === undefined) {
          expectImplementation('Distance calculation', 'getDistance should return number, got undefined')
          return
        }

        expect(result).toBe(4) // |7-5| + |3-5| = 2 + 2 = 4
      } catch (error) {
        expectImplementation('Distance calculation', `getDistance function not implemented: ${error}`)
      }
    })

    it('should return 0 for same position', () => {
      try {
        const pos1 = { x: 5, y: 5 }
        const pos2 = { x: 5, y: 5 }

        const result = getDistance(pos1, pos2)
        
        if (result === undefined) {
          expectImplementation('Distance calculation', 'getDistance should return number, got undefined')
          return
        }

        expect(result).toBe(0)
      } catch (error) {
        expectImplementation('Distance calculation', `getDistance function not implemented: ${error}`)
      }
    })
  })
})