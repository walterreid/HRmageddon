import { describe, it, expect, beforeEach } from 'vitest'
import { ABILITIES, getAbilityById, getUnitAbilities, canUseAbility, getValidTargets } from './abilities'
import { createMockUnit, createMockGameState } from '../test/helpers.ts'
import { UnitType, StatusType, type GameState } from 'shared'

describe('Ability System', () => {
  let mockGameState: GameState

  beforeEach(() => {
    mockGameState = createMockGameState()
  })

  describe('Ability Definitions', () => {
    it('should have all required abilities defined', () => {
      const requiredAbilities = [
        'fetch_coffee', 'overtime', 'file_it', 'harass', 'pink_slip', 
        'mediation', 'hack_system', 'tech_support', 'audit', 
        'creative_accounting', 'legal_threat', 'contract_negotiation',
        'executive_order', 'corporate_restructuring'
      ]
      
      requiredAbilities.forEach(abilityId => {
        expect(ABILITIES[abilityId]).toBeDefined()
        expect(ABILITIES[abilityId].id).toBe(abilityId)
        expect(ABILITIES[abilityId].name).toBeDefined()
        expect(ABILITIES[abilityId].description).toBeDefined()
        expect(ABILITIES[abilityId].cost).toBeGreaterThanOrEqual(0)
        expect(ABILITIES[abilityId].cost).toBeLessThanOrEqual(3)
        expect(ABILITIES[abilityId].cooldown).toBeGreaterThanOrEqual(-1)
        expect(ABILITIES[abilityId].range).toBeGreaterThanOrEqual(0)
        expect(ABILITIES[abilityId].targetType).toBeDefined()
        expect(ABILITIES[abilityId].effect).toBeDefined()
      })
    })

    it('should have proper coffee costs for different ability tiers', () => {
      // 0 Coffee: Utility abilities, buffs with drawbacks
      expect(ABILITIES.fetch_coffee.cost).toBe(0)
      expect(ABILITIES.audit.cost).toBe(1)
      
      // 1 Coffee: Standard abilities, single target
      expect(ABILITIES.file_it.cost).toBe(1)
      expect(ABILITIES.harass.cost).toBe(1)
      expect(ABILITIES.mediation.cost).toBe(1)
      
      // 2 Coffee: Powerful abilities, AoE, game-changers
      expect(ABILITIES.pink_slip.cost).toBe(2)
      expect(ABILITIES.legal_threat.cost).toBe(2)
      
      // 3 Coffee: Ultimate abilities
      expect(ABILITIES.executive_order.cost).toBe(3)
      expect(ABILITIES.corporate_restructuring.cost).toBe(3)
    })

    it('should have proper cooldowns for different ability tiers', () => {
      // 1-2 turns: Minor abilities
      expect(ABILITIES.fetch_coffee.cooldown).toBe(1)
      expect(ABILITIES.file_it.cooldown).toBe(2)
      
      // 3-4 turns: Major abilities
      expect(ABILITIES.creative_accounting.cooldown).toBe(3)
      expect(ABILITIES.legal_threat.cooldown).toBe(3)
      expect(ABILITIES.executive_order.cooldown).toBe(4)
      
      // -1: Ultimate abilities (once per game)
      expect(ABILITIES.pink_slip.cooldown).toBe(-1)
    })

    it('should have proper ranges for different ability types', () => {
      // 0 (Self): Personal buffs
      expect(ABILITIES.overtime.range).toBe(0)
      expect(ABILITIES.audit.range).toBe(0)
      expect(ABILITIES.creative_accounting.range).toBe(0)
      
      // 1 (Melee): Adjacent targets
      expect(ABILITIES.fetch_coffee.range).toBe(1)
      expect(ABILITIES.pink_slip.range).toBe(1)
      expect(ABILITIES.mediation.range).toBe(1)
      
      // 2-3: Standard range
      expect(ABILITIES.file_it.range).toBe(3)
      expect(ABILITIES.harass.range).toBe(2)
      expect(ABILITIES.hack_system.range).toBe(3)
      
      // Global abilities (rare)
      expect(ABILITIES.executive_order.range).toBe(0) // Affects all allies
    })
  })

  describe('Unit Ability Mappings', () => {
    it('should assign correct abilities to each unit type', () => {
      expect(getUnitAbilities(UnitType.INTERN)).toHaveLength(2)
      expect(getUnitAbilities(UnitType.SECRETARY)).toHaveLength(1)
      expect(getUnitAbilities(UnitType.SALES_REP)).toHaveLength(1)
      expect(getUnitAbilities(UnitType.HR_MANAGER)).toHaveLength(2)
      expect(getUnitAbilities(UnitType.IT_SPECIALIST)).toHaveLength(2)
      expect(getUnitAbilities(UnitType.ACCOUNTANT)).toHaveLength(2)
      expect(getUnitAbilities(UnitType.LEGAL_COUNSEL)).toHaveLength(2)
      expect(getUnitAbilities(UnitType.EXECUTIVE)).toHaveLength(2)
    })

    it('should return valid ability objects for each unit type', () => {
      Object.values(UnitType).forEach(unitType => {
        const abilities = getUnitAbilities(unitType)
        abilities.forEach(ability => {
          expect(ability).toBeDefined()
          expect(ability.id).toBeDefined()
          expect(ABILITIES[ability.id]).toBe(ability)
        })
      })
    })
  })

  describe('Ability Usage Validation', () => {
    it('should check if unit has required actions to use ability', () => {
      const unit = createMockUnit({ actionsRemaining: 0 })
      const ability = ABILITIES.fetch_coffee
      
      expect(canUseAbility(unit, ability.id)).toBe(false)
      
      unit.actionsRemaining = 1
      expect(canUseAbility(unit, ability.id)).toBe(true)
    })

    it('should check if unit has the required ability', () => {
      const unit = createMockUnit({ abilities: [] })
      const ability = ABILITIES.fetch_coffee
      
      expect(canUseAbility(unit, ability.id)).toBe(false)
      
      unit.abilities = [ability.id]
      expect(canUseAbility(unit, ability.id)).toBe(true)
    })

    it('should check ability cooldowns', () => {
      const unit = createMockUnit({ 
        abilities: ['fetch_coffee'],
        abilityCooldowns: { 'fetch_coffee': 2 }
      })
      
      expect(canUseAbility(unit, 'fetch_coffee')).toBe(false)
      
      unit.abilityCooldowns['fetch_coffee'] = 0
      expect(canUseAbility(unit, 'fetch_coffee')).toBe(true)
    })

    it('should handle one-time use abilities correctly', () => {
      const unit = createMockUnit({ 
        abilities: ['pink_slip'],
        abilityCooldowns: { 'pink_slip': -1 }
      })
      
      // One-time use abilities should not be usable after use
      expect(canUseAbility(unit, 'pink_slip')).toBe(false)
    })
  })

  describe('Ability Targeting', () => {
    it('should return valid targets for self-targeting abilities', () => {
      const unit = createMockUnit()
      const ability = ABILITIES.overtime
      
      const targets = getValidTargets(unit, ability, mockGameState.board, mockGameState.units)
      expect(targets).toHaveLength(1)
      expect(targets[0]).toBe(unit)
    })

    it('should return valid targets for ally-targeting abilities', () => {
      const caster = createMockUnit({ playerId: 'player1', position: { x: 0, y: 0 } })
      const ally = createMockUnit({ playerId: 'player1', position: { x: 1, y: 0 } })
      const enemy = createMockUnit({ playerId: 'player2', position: { x: 2, y: 0 } })
      
      mockGameState.units = [caster, ally, enemy]
      mockGameState.board[0][1].occupied = ally
      mockGameState.board[0][2].occupied = enemy
      
      const ability = ABILITIES.fetch_coffee
      const targets = getValidTargets(caster, ability, mockGameState.board, mockGameState.units)
      
      expect(targets).toContain(ally)
      expect(targets).not.toContain(enemy)
    })

    it('should return valid targets for enemy-targeting abilities', () => {
      const caster = createMockUnit({ playerId: 'player1', position: { x: 0, y: 0 } })
      const ally = createMockUnit({ playerId: 'player1', position: { x: 1, y: 0 } })
      const enemy = createMockUnit({ playerId: 'player2', position: { x: 2, y: 0 } })
      
      mockGameState.units = [caster, ally, enemy]
      mockGameState.board[0][1].occupied = ally
      mockGameState.board[0][2].occupied = enemy
      
      const ability = ABILITIES.file_it
      const targets = getValidTargets(caster, ability, mockGameState.board, mockGameState.units)
      
      expect(targets).toContain(enemy)
      expect(targets).not.toContain(ally)
    })

    it('should respect ability range limits', () => {
      const caster = createMockUnit({ position: { x: 0, y: 0 } })
      const nearbyEnemy = createMockUnit({ 
        playerId: 'player2', 
        position: { x: 1, y: 0 } 
      })
      const farEnemy = createMockUnit({ 
        playerId: 'player2', 
        position: { x: 3, y: 0 } 
      })
      
      mockGameState.units = [caster, nearbyEnemy, farEnemy]
      mockGameState.board[0][1].occupied = nearbyEnemy
      mockGameState.board[0][3].occupied = farEnemy
      
      const ability = ABILITIES.file_it // Range 3
      const targets = getValidTargets(caster, ability, mockGameState.board, mockGameState.units)
      
      expect(targets).toContain(nearbyEnemy)
      expect(targets).toContain(farEnemy) // Within range 3
    })
  })

  describe('Ability Effects', () => {
    it('should apply status effects correctly', () => {
      const caster = createMockUnit()
      const target = createMockUnit({ playerId: 'player1' })
      const ability = ABILITIES.fetch_coffee
      
      const result = ability.effect(caster, target)
      
      expect(result.success).toBe(true)
      expect(result.statusApplied).toBeDefined()
      expect(result.statusApplied![0].type).toBe(StatusType.ON_DEADLINE)
      expect(result.statusApplied![0].duration).toBe(2)
    })

    it('should handle invalid targets correctly', () => {
      const caster = createMockUnit({ playerId: 'player1' })
      const enemyTarget = createMockUnit({ playerId: 'player2' })
      const ability = ABILITIES.fetch_coffee // Ally-only
      
      const result = ability.effect(caster, enemyTarget)
      
      expect(result.success).toBe(false)
      expect(result.message).toContain('Must target an ally')
    })

    it('should apply damage correctly for offensive abilities', () => {
      const caster = createMockUnit()
      const target = createMockUnit({ 
        playerId: 'player2', 
        hp: 2 
      })
      const ability = ABILITIES.pink_slip
      
      const result = ability.effect(caster, target)
      
      expect(result.success).toBe(true)
      expect(result.damageDealt).toBe(2)
    })

    it('should apply healing correctly for support abilities', () => {
      const caster = createMockUnit()
      const target = createMockUnit({ 
        playerId: 'player1',
        hp: 5,
        maxHp: 10
      })
      const ability = ABILITIES.mediation
      
      const result = ability.effect(caster, target)
      
      expect(result.success).toBe(true)
      expect(result.healingDone).toBe(1)
    })

    it('should grant action bonuses correctly', () => {
      const caster = createMockUnit()
      const ability = ABILITIES.overtime
      
      const result = ability.effect(caster, caster)
      
      expect(result.success).toBe(true)
      expect(result.actionBonus).toBe(1)
    })

    it('should enforce ability-specific conditions', () => {
      const caster = createMockUnit()
      const highHpTarget = createMockUnit({ 
        playerId: 'player2', 
        hp: 5 
      })
      const ability = ABILITIES.pink_slip // Requires target ≤2 HP
      
      const result = ability.effect(caster, highHpTarget)
      
      expect(result.success).toBe(false)
      expect(result.message).toContain('too much HP')
    })
  })

  describe('Helper Functions', () => {
    it('should retrieve abilities by ID', () => {
      const ability = getAbilityById('fetch_coffee')
      expect(ability).toBeDefined()
      expect(ability!.id).toBe('fetch_coffee')
      
      const nonExistent = getAbilityById('non_existent')
      expect(nonExistent).toBeUndefined()
    })

    it('should return empty array for unknown unit types', () => {
      const abilities = getUnitAbilities('unknown' as UnitType)
      expect(abilities).toEqual([])
    })
  })

  describe('Status Effect Integration', () => {
    it('should apply multiple status effects when appropriate', () => {
      const caster = createMockUnit()
      const ability = ABILITIES.overtime
      
      const result = ability.effect(caster, caster)
      
      expect(result.success).toBe(true)
      expect(result.statusApplied).toHaveLength(1)
      expect(result.statusApplied![0].type).toBe(StatusType.EXHAUSTED)
    })

    it('should handle status effect durations correctly', () => {
      const caster = createMockUnit()
      const target = createMockUnit({ playerId: 'player1' })
      const ability = ABILITIES.fetch_coffee
      
      const result = ability.effect(caster, target)
      
      expect(result.statusApplied![0].duration).toBe(2)
    })
  })

  describe('Edge Cases', () => {
    it('should handle units with no abilities', () => {
      const unit = createMockUnit({ abilities: [] })
      
      expect(canUseAbility(unit, 'fetch_coffee')).toBe(false)
      expect(getValidTargets(unit, ABILITIES.fetch_coffee, mockGameState.board, mockGameState.units)).toEqual([])
    })

    it('should handle abilities with no valid targets', () => {
      const unit = createMockUnit({ position: { x: 0, y: 0 } })
      const ability = ABILITIES.fetch_coffee
      
      // No allies in range
      mockGameState.units = [unit]
      mockGameState.board[0][0].occupied = unit
      
      const targets = getValidTargets(unit, ability, mockGameState.board, mockGameState.units)
      expect(targets).toEqual([])
    })

    it('should handle board boundaries correctly', () => {
      const unit = createMockUnit({ position: { x: 0, y: 0 } })
      const ability = ABILITIES.file_it // Range 3
      
      // Target at edge of board
      const edgeTarget = createMockUnit({ 
        playerId: 'player2', 
        position: { x: 2, y: 0 } 
      })
      mockGameState.units = [unit, edgeTarget]
      mockGameState.board[0][2].occupied = edgeTarget
      
      const targets = getValidTargets(unit, ability, mockGameState.board, mockGameState.units)
      expect(targets).toContain(edgeTarget)
    })
  })
})
