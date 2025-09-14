import { describe, it, expect, beforeEach } from 'vitest'
import { useUnitStore } from './unitStore'
import { createMockUnit } from '../game/test/helpers'
import { UnitType } from 'shared'

describe('Unit Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    useUnitStore.setState({
      units: [],
      selectedUnit: null
    })
  })

  describe('Unit Management', () => {
    it('should add a unit to the store', () => {
      const unit = createMockUnit({ id: 'unit1', type: UnitType.INTERN })

      useUnitStore.getState().addUnit(unit)

      const units = useUnitStore.getState().units
      expect(units).toHaveLength(1)
      expect(units[0]).toEqual(unit)
    })

    it('should select a unit', () => {
      const unit = createMockUnit({ id: 'unit1' })
      useUnitStore.getState().addUnit(unit)

      useUnitStore.getState().selectUnit(unit)

      expect(useUnitStore.getState().selectedUnit).toBe(unit)
    })

    it('should deselect unit when selecting null', () => {
      const unit = createMockUnit({ id: 'unit1' })
      useUnitStore.getState().addUnit(unit)
      useUnitStore.getState().selectUnit(unit)

      useUnitStore.getState().selectUnit(null)

      expect(useUnitStore.getState().selectedUnit).toBe(null)
    })
  })

  describe('Unit Movement', () => {
    it('should move a unit and update position, hasMoved, and actionsRemaining', () => {
      const unit = createMockUnit({ 
        id: 'unit1', 
        position: { x: 5, y: 5 },
        actionsRemaining: 2,
        hasMoved: false
      })
      useUnitStore.getState().addUnit(unit)

      useUnitStore.getState().moveUnit('unit1', { x: 6, y: 5 })

      const updatedUnit = useUnitStore.getState().units.find(u => u.id === 'unit1')
      expect(updatedUnit?.position).toEqual({ x: 6, y: 5 })
      expect(updatedUnit?.hasMoved).toBe(true)
      expect(updatedUnit?.actionsRemaining).toBe(1)
    })

    it('should not move a unit that has no actions remaining', () => {
      const unit = createMockUnit({ 
        id: 'unit1', 
        position: { x: 5, y: 5 },
        actionsRemaining: 0
      })
      useUnitStore.getState().addUnit(unit)

      useUnitStore.getState().moveUnit('unit1', { x: 6, y: 5 })

      const updatedUnit = useUnitStore.getState().units.find(u => u.id === 'unit1')
      expect(updatedUnit?.position).toEqual({ x: 5, y: 5 })
      expect(updatedUnit?.actionsRemaining).toBe(0)
    })
  })

  describe('Unit Combat', () => {
    it('should attack a unit and reduce HP, set hasAttacked, and decrement actionsRemaining', () => {
      const attacker = createMockUnit({ 
        id: 'attacker', 
        attackDamage: 3,
        actionsRemaining: 2,
        hasAttacked: false
      })
      const target = createMockUnit({ 
        id: 'target', 
        hp: 5
      })
      useUnitStore.getState().addUnit(attacker)
      useUnitStore.getState().addUnit(target)

      useUnitStore.getState().attackUnit('attacker', 'target')

      const updatedAttacker = useUnitStore.getState().units.find(u => u.id === 'attacker')
      const updatedTarget = useUnitStore.getState().units.find(u => u.id === 'target')
      
      expect(updatedTarget?.hp).toBe(2) // 5 - 3 = 2
      expect(updatedAttacker?.hasAttacked).toBe(true)
      expect(updatedAttacker?.actionsRemaining).toBe(1)
    })

    it('should remove unit if HP reaches 0', () => {
      const attacker = createMockUnit({ 
        id: 'attacker', 
        attackDamage: 5
      })
      const target = createMockUnit({ 
        id: 'target', 
        hp: 3
      })
      useUnitStore.getState().addUnit(attacker)
      useUnitStore.getState().addUnit(target)

      useUnitStore.getState().attackUnit('attacker', 'target')

      const units = useUnitStore.getState().units
      expect(units).toHaveLength(1)
      expect(units.find(u => u.id === 'target')).toBeUndefined()
    })
  })

  describe('Unit Queries', () => {
    beforeEach(() => {
      const units = [
        createMockUnit({ id: 'unit1', playerId: 'player1', type: UnitType.INTERN }),
        createMockUnit({ id: 'unit2', playerId: 'player1', type: UnitType.HR_MANAGER }),
        createMockUnit({ id: 'unit3', playerId: 'player2', type: UnitType.INTERN })
      ]
      useUnitStore.setState({ units })
    })

    it('should get unit by ID', () => {
      const unit = useUnitStore.getState().getUnitById('unit1')
      expect(unit?.id).toBe('unit1')
    })

    it('should get units by player', () => {
      const player1Units = useUnitStore.getState().getUnitsByPlayer('player1')
      expect(player1Units).toHaveLength(2)
      expect(player1Units.every(u => u.playerId === 'player1')).toBe(true)
    })

    it('should get units by type', () => {
      const internUnits = useUnitStore.getState().getUnitsByType(UnitType.INTERN)
      expect(internUnits).toHaveLength(2)
      expect(internUnits.every(u => u.type === UnitType.INTERN)).toBe(true)
    })

    it('should get my units', () => {
      const myUnits = useUnitStore.getState().getMyUnits('player1')
      expect(myUnits).toHaveLength(2)
      expect(myUnits.every(u => u.playerId === 'player1')).toBe(true)
    })

    it('should get enemy units', () => {
      const enemyUnits = useUnitStore.getState().getEnemyUnits('player1')
      expect(enemyUnits).toHaveLength(1)
      expect(enemyUnits.every(u => u.playerId === 'player2')).toBe(true)
    })
  })

  describe('Movement Validation', () => {
    it('should check if unit can move', () => {
      const unit = createMockUnit({ 
        id: 'unit1', 
        actionsRemaining: 2,
        hasMoved: false
      })
      useUnitStore.getState().addUnit(unit)

      const canMove = useUnitStore.getState().canUnitMove(unit)
      expect(canMove).toBe(true)
    })

    it('should not allow movement if unit has no actions', () => {
      const unit = createMockUnit({ 
        id: 'unit1', 
        actionsRemaining: 0
      })
      useUnitStore.getState().addUnit(unit)

      const canMove = useUnitStore.getState().canUnitMove(unit)
      expect(canMove).toBe(false)
    })

    it('should not allow movement if unit already moved', () => {
      const unit = createMockUnit({ 
        id: 'unit1', 
        actionsRemaining: 2,
        hasMoved: true
      })
      useUnitStore.getState().addUnit(unit)

      const canMove = useUnitStore.getState().canUnitMove(unit)
      expect(canMove).toBe(false)
    })
  })

  describe('Combat Validation', () => {
    it('should check if unit can attack', () => {
      const unit = createMockUnit({ 
        id: 'unit1', 
        actionsRemaining: 2,
        hasAttacked: false
      })
      useUnitStore.getState().addUnit(unit)

      const canAttack = useUnitStore.getState().canUnitAttack(unit)
      expect(canAttack).toBe(true)
    })

    it('should not allow attack if unit has no actions', () => {
      const unit = createMockUnit({ 
        id: 'unit1', 
        actionsRemaining: 0
      })
      useUnitStore.getState().addUnit(unit)

      const canAttack = useUnitStore.getState().canUnitAttack(unit)
      expect(canAttack).toBe(false)
    })

    it('should not allow attack if unit already attacked', () => {
      const unit = createMockUnit({ 
        id: 'unit1', 
        actionsRemaining: 2,
        hasAttacked: true
      })
      useUnitStore.getState().addUnit(unit)

      const canAttack = useUnitStore.getState().canUnitAttack(unit)
      expect(canAttack).toBe(false)
    })
  })
})
