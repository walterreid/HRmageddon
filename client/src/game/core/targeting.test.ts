import { describe, it, expect } from 'vitest'
import { getTilesInCone, isValidTarget } from './targeting'
import { createMockUnit } from '../test/helpers'
import { UnitType, AbilityTargetingType } from 'shared'

describe('Targeting System', () => {
  describe('getTilesInCone', () => {
    it('should return the correct tiles for a 90-degree cone facing right', () => {
      const casterPosition = { x: 5, y: 5 }
      const direction = { x: 1, y: 0 } // Facing right
      const range = 3
      const coneAngle = 90

      const result = getTilesInCone(casterPosition, direction, range, coneAngle)

      // Should include tiles to the right of the caster
      expect(result).toContainEqual({ x: 6, y: 5 })
      expect(result).toContainEqual({ x: 7, y: 5 })
      expect(result).toContainEqual({ x: 8, y: 5 })
      
      // Should include diagonal tiles within cone
      expect(result).toContainEqual({ x: 6, y: 4 })
      expect(result).toContainEqual({ x: 6, y: 6 })
      
      // Should not include tiles behind the caster
      expect(result).not.toContainEqual({ x: 4, y: 5 })
      expect(result).not.toContainEqual({ x: 3, y: 5 })
    })

    it('should return the correct tiles for a 45-degree cone facing diagonally', () => {
      const casterPosition = { x: 5, y: 5 }
      const direction = { x: 1, y: 1 } // Facing diagonally down-right
      const range = 2
      const coneAngle = 45

      const result = getTilesInCone(casterPosition, direction, range, coneAngle)

      // Should include tiles in the diagonal direction
      expect(result).toContainEqual({ x: 6, y: 6 })
      expect(result).toContainEqual({ x: 7, y: 7 })
      
      // Should not include tiles too far from the direction
      expect(result).not.toContainEqual({ x: 6, y: 5 })
      expect(result).not.toContainEqual({ x: 5, y: 6 })
    })

    it('should return an empty array if the direction vector is zero', () => {
      const casterPosition = { x: 5, y: 5 }
      const direction = { x: 0, y: 0 }
      const range = 3
      const coneAngle = 90

      const result = getTilesInCone(casterPosition, direction, range, coneAngle)

      expect(result).toEqual([])
    })

    it('should respect the range limit and not include tiles beyond it', () => {
      const casterPosition = { x: 5, y: 5 }
      const direction = { x: 1, y: 0 }
      const range = 2
      const coneAngle = 90

      const result = getTilesInCone(casterPosition, direction, range, coneAngle)

      // Should not include tiles beyond range
      expect(result).not.toContainEqual({ x: 8, y: 5 })
      expect(result).not.toContainEqual({ x: 9, y: 5 })
      
      // Should include tiles within range
      expect(result).toContainEqual({ x: 6, y: 5 })
      expect(result).toContainEqual({ x: 7, y: 5 })
    })

    it('should not include the caster position itself', () => {
      const casterPosition = { x: 5, y: 5 }
      const direction = { x: 1, y: 0 }
      const range = 3
      const coneAngle = 90

      const result = getTilesInCone(casterPosition, direction, range, coneAngle)

      expect(result).not.toContainEqual({ x: 5, y: 5 })
    })
  })

  describe('isValidTarget', () => {
    it('should validate single target abilities correctly', () => {
      const source = createMockUnit({ id: 'source', position: { x: 5, y: 5 }, playerId: 'player1' })
      const target = createMockUnit({ id: 'target', position: { x: 6, y: 5 }, playerId: 'player2' })
      const ability = {
        id: 'test_ability',
        range: 2,
        targetType: 'ENEMY',
        targetingType: AbilityTargetingType.SINGLE_TARGET
      }
      const board = Array(10).fill(null).map(() => Array(10).fill({ type: 'NORMAL' }))
      const units = [source, target]

      const result = isValidTarget(source, target, ability, board, units)

      expect(result).toBe(true)
    })

    it('should reject targets outside range', () => {
      const source = createMockUnit({ id: 'source', position: { x: 5, y: 5 }, playerId: 'player1' })
      const target = createMockUnit({ id: 'target', position: { x: 8, y: 5 }, playerId: 'player2' })
      const ability = {
        id: 'test_ability',
        range: 2,
        targetType: 'ENEMY',
        targetingType: AbilityTargetingType.SINGLE_TARGET
      }
      const board = Array(10).fill(null).map(() => Array(10).fill({ type: 'NORMAL' }))
      const units = [source, target]

      const result = isValidTarget(source, target, ability, board, units)

      expect(result).toBe(false)
    })

    it('should reject friendly targets for enemy-only abilities', () => {
      const source = createMockUnit({ id: 'source', position: { x: 5, y: 5 }, playerId: 'player1' })
      const target = createMockUnit({ id: 'target', position: { x: 6, y: 5 }, playerId: 'player1' })
      const ability = {
        id: 'test_ability',
        range: 2,
        targetType: 'ENEMY',
        targetingType: AbilityTargetingType.SINGLE_TARGET
      }
      const board = Array(10).fill(null).map(() => Array(10).fill({ type: 'NORMAL' }))
      const units = [source, target]

      const result = isValidTarget(source, target, ability, board, units)

      expect(result).toBe(false)
    })
  })
})
