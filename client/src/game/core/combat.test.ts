import { describe, it, expect, beforeEach } from 'vitest'
import { 
  calculatePossibleTargets, 
  isValidAttack, 
  calculateDamage,
  getEnemiesInRange,
  getWeakestEnemyInRange,
  getStrongestEnemyInRange,
  canAttackAnyEnemy,
  getUnitsThatCanAttack,
  calculateTotalDamageToTarget,
  canKillTargetThisTurn
} from './combat'
import { createMockUnit, createMockGameState } from '../test/helpers'
import { UnitType } from 'shared'

describe('Combat System', () => {
  let mockGameState: any
  let mockUnits: any[]

  beforeEach(() => {
    mockGameState = createMockGameState()
    mockUnits = mockGameState.units
  })

  describe('calculateDamage', () => {
    it('should correctly calculate damage using unit\'s attackDamage', () => {
      const attacker = createMockUnit({ 
        id: 'attacker', 
        attackDamage: 3 
      })
      const target = createMockUnit({ 
        id: 'target', 
        hp: 5 
      })

      const result = calculateDamage(attacker, target)

      expect(result).toBe(3)
    })

    it('should handle different attack damage values', () => {
      const attacker = createMockUnit({ 
        id: 'attacker', 
        attackDamage: 5 
      })
      const target = createMockUnit({ 
        id: 'target', 
        hp: 10 
      })

      const result = calculateDamage(attacker, target)

      expect(result).toBe(5)
    })
  })

  describe('calculatePossibleTargets', () => {
    it('should validate an attack at the exact maximum attackRange', () => {
      const attacker = createMockUnit({ 
        id: 'attacker', 
        position: { x: 5, y: 5 }, 
        attackRange: 2 
      })
      
      const target = createMockUnit({ 
        id: 'target', 
        position: { x: 7, y: 5 }, 
        playerId: 'player2' 
      })

      const result = calculatePossibleTargets(attacker, { units: [attacker, target] })

      expect(result).toContainEqual({ x: 7, y: 5 })
    })

    it('should not include targets beyond attack range', () => {
      const attacker = createMockUnit({ 
        id: 'attacker', 
        position: { x: 5, y: 5 }, 
        attackRange: 2 
      })
      
      const target = createMockUnit({ 
        id: 'target', 
        position: { x: 8, y: 5 }, 
        playerId: 'player2' 
      })

      const result = calculatePossibleTargets(attacker, { units: [attacker, target] })

      expect(result).not.toContainEqual({ x: 8, y: 5 })
    })

    it('should not allow a unit to target friendly units', () => {
      const attacker = createMockUnit({ 
        id: 'attacker', 
        position: { x: 5, y: 5 }, 
        attackRange: 2,
        playerId: 'player1'
      })
      
      const friendlyTarget = createMockUnit({ 
        id: 'friendly', 
        position: { x: 6, y: 5 }, 
        playerId: 'player1' 
      })

      const result = calculatePossibleTargets(attacker, [attacker, friendlyTarget])

      expect(result).not.toContainEqual({ x: 6, y: 5 })
    })

    it('should include enemy units within range', () => {
      const attacker = createMockUnit({ 
        id: 'attacker', 
        position: { x: 5, y: 5 }, 
        attackRange: 2,
        playerId: 'player1'
      })
      
      const enemyTarget = createMockUnit({ 
        id: 'enemy', 
        position: { x: 6, y: 5 }, 
        playerId: 'player2' 
      })

      const result = calculatePossibleTargets(attacker, [attacker, enemyTarget])

      expect(result).toContainEqual({ x: 6, y: 5 })
    })
  })

  describe('isValidAttack', () => {
    it('should validate attacks within range', () => {
      const attacker = createMockUnit({ 
        id: 'attacker', 
        position: { x: 5, y: 5 }, 
        attackRange: 2,
        playerId: 'player1'
      })
      
      const target = createMockUnit({ 
        id: 'target', 
        position: { x: 6, y: 5 }, 
        playerId: 'player2' 
      })

      const result = isValidAttack(attacker, target, { units: [attacker, target] })

      expect(result).toBe(true)
    })

    it('should reject attacks on friendly units', () => {
      const attacker = createMockUnit({ 
        id: 'attacker', 
        position: { x: 5, y: 5 }, 
        attackRange: 2,
        playerId: 'player1'
      })
      
      const friendlyTarget = createMockUnit({ 
        id: 'friendly', 
        position: { x: 6, y: 5 }, 
        playerId: 'player1' 
      })

      const result = isValidAttack(attacker, friendlyTarget, { units: [attacker, friendlyTarget] })

      expect(result).toBe(false)
    })

    it('should reject attacks beyond range', () => {
      const attacker = createMockUnit({ 
        id: 'attacker', 
        position: { x: 5, y: 5 }, 
        attackRange: 1,
        playerId: 'player1'
      })
      
      const target = createMockUnit({ 
        id: 'target', 
        position: { x: 7, y: 5 }, 
        playerId: 'player2' 
      })

      const result = isValidAttack(attacker, target, { units: [attacker, target] })

      expect(result).toBe(false)
    })
  })

  describe('getEnemiesInRange', () => {
    it('should find enemies within attack range', () => {
      const unit = createMockUnit({ 
        id: 'unit1', 
        position: { x: 5, y: 5 }, 
        attackRange: 2,
        playerId: 'player1'
      })
      
      const enemy1 = createMockUnit({ 
        id: 'enemy1', 
        position: { x: 6, y: 5 }, 
        playerId: 'player2' 
      })
      
      const enemy2 = createMockUnit({ 
        id: 'enemy2', 
        position: { x: 8, y: 5 }, 
        playerId: 'player2' 
      })

      const result = getEnemiesInRange(unit, { units: [unit, enemy1, enemy2] })

      expect(result).toContain(enemy1)
      expect(result).not.toContain(enemy2)
      expect(result).not.toContain(unit)
    })
  })

  describe('getWeakestEnemyInRange', () => {
    it('should find the enemy with lowest HP in range', () => {
      const unit = createMockUnit({ 
        id: 'unit1', 
        position: { x: 5, y: 5 }, 
        attackRange: 2,
        playerId: 'player1'
      })
      
      const weakEnemy = createMockUnit({ 
        id: 'weak', 
        position: { x: 6, y: 5 }, 
        playerId: 'player2',
        hp: 1
      })
      
      const strongEnemy = createMockUnit({ 
        id: 'strong', 
        position: { x: 6, y: 6 }, 
        playerId: 'player2',
        hp: 5
      })

      const result = getWeakestEnemyInRange(unit, { units: [unit, weakEnemy, strongEnemy] })

      expect(result).toBe(weakEnemy)
    })
  })

  describe('getStrongestEnemyInRange', () => {
    it('should find the enemy with highest HP in range', () => {
      const unit = createMockUnit({ 
        id: 'unit1', 
        position: { x: 5, y: 5 }, 
        attackRange: 2,
        playerId: 'player1'
      })
      
      const weakEnemy = createMockUnit({ 
        id: 'weak', 
        position: { x: 6, y: 5 }, 
        playerId: 'player2',
        hp: 1
      })
      
      const strongEnemy = createMockUnit({ 
        id: 'strong', 
        position: { x: 6, y: 6 }, 
        playerId: 'player2',
        hp: 5
      })

      const result = getStrongestEnemyInRange(unit, { units: [unit, weakEnemy, strongEnemy] })

      expect(result).toBe(strongEnemy)
    })
  })

  describe('canAttackAnyEnemy', () => {
    it('should return true if any enemies are in range', () => {
      const unit = createMockUnit({ 
        id: 'unit1', 
        position: { x: 5, y: 5 }, 
        attackRange: 2,
        playerId: 'player1'
      })
      
      const enemy = createMockUnit({ 
        id: 'enemy', 
        position: { x: 6, y: 5 }, 
        playerId: 'player2' 
      })

      const result = canAttackAnyEnemy(unit, { units: [unit, enemy] })

      expect(result).toBe(true)
    })

    it('should return false if no enemies are in range', () => {
      const unit = createMockUnit({ 
        id: 'unit1', 
        position: { x: 5, y: 5 }, 
        attackRange: 1,
        playerId: 'player1'
      })
      
      const enemy = createMockUnit({ 
        id: 'enemy', 
        position: { x: 7, y: 5 }, 
        playerId: 'player2' 
      })

      const result = canAttackAnyEnemy(unit, { units: [unit, enemy] })

      expect(result).toBe(false)
    })
  })

  describe('canKillTargetThisTurn', () => {
    it('should return true if attacker can kill target in one hit', () => {
      const attacker = createMockUnit({ 
        id: 'attacker', 
        attackDamage: 5,
        playerId: 'player1'
      })
      
      const target = createMockUnit({ 
        id: 'target', 
        hp: 3,
        playerId: 'player2' 
      })

      const result = canKillTargetThisTurn(target, { units: [attacker, target] })

      expect(result).toBe(true)
    })

    it('should return false if attacker cannot kill target in one hit', () => {
      const attacker = createMockUnit({ 
        id: 'attacker', 
        attackDamage: 2,
        playerId: 'player1'
      })
      
      const target = createMockUnit({ 
        id: 'target', 
        hp: 5,
        playerId: 'player2' 
      })

      const result = canKillTargetThisTurn(target, { units: [attacker, target] })

      expect(result).toBe(false)
    })
  })
})
