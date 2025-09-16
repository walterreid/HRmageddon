import { type Unit, StatusType, type Coordinate, type Ability, TargetType, AbilityTargetingType, type Tile, type DataAbility } from 'shared'
import { dataManager } from '../data/DataManager'

// Get ability from DataManager
export function getAbilityById(id: string): Ability | undefined {
  console.log(`🔍 getAbilityById: Looking for ability "${id}"`)
  
  const dataAbility = dataManager.getAbility(id)
  if (dataAbility) {
    console.log(`✅ getAbilityById: Found data ability for "${id}":`, dataAbility)
    const converted = convertDataAbilityToLegacyAbility(dataAbility)
    console.log(`🔄 getAbilityById: Converted ability:`, converted)
    return converted
  }
  
  console.log(`❌ getAbilityById: No ability found for "${id}"`)
  return undefined
}

// Convert DataAbility to legacy Ability format
function convertDataAbilityToLegacyAbility(dataAbility: DataAbility): Ability {
  // Determine target type from effects
  let targetType: TargetType = TargetType.ENEMY // Default
  if (dataAbility.effects.some(e => e.target === 'ally')) {
    targetType = TargetType.ALLY
  } else if (dataAbility.effects.some(e => e.target === 'self')) {
    targetType = TargetType.SELF
  } else if (dataAbility.effects.some(e => e.target === 'all_allies')) {
    targetType = TargetType.ALL_ALLIES
  } else if (dataAbility.effects.some(e => e.target === 'all_enemies')) {
    targetType = TargetType.ALL_ENEMIES
  }

  // Determine range from range_pattern_key
  let range = 1 // Default
  if (dataAbility.range_pattern_key === 'centered_cross_burst') {
    range = 1 // Cross pattern is 1 tile in each direction
  } else if (dataAbility.range_pattern_key === 'forward_cone') {
    range = 3 // Cone abilities typically have longer range
  } else if (dataAbility.range_pattern_key === 'firewall_line') {
    range = 4 // Firewall can be placed at distance
  } else if (dataAbility.range_pattern_key === 'single_target_ranged') {
    range = 3 // Ranged abilities
  } else if (dataAbility.range_pattern_key === 'self_target') {
    range = 0 // Self-targeting abilities
  } else if (dataAbility.range_pattern_key === 'all_allies' || dataAbility.range_pattern_key === 'all_enemies') {
    range = 0 // Global abilities
  }

  // Determine targeting type from range pattern
  let targetingType = AbilityTargetingType.SINGLE_TARGET
  if (dataAbility.range_pattern_key === 'forward_cone') {
    targetingType = AbilityTargetingType.AOE_CONE
  } else if (dataAbility.range_pattern_key === 'centered_cross_burst') {
    targetingType = AbilityTargetingType.AOE_CIRCLE
  } else if (dataAbility.range_pattern_key === 'all_allies') {
    targetingType = AbilityTargetingType.ALL_ALLIES
  } else if (dataAbility.range_pattern_key === 'all_enemies') {
    targetingType = AbilityTargetingType.ALL_ENEMIES
  } else if (dataAbility.range_pattern_key === 'self_target') {
    targetingType = AbilityTargetingType.SELF_BUFF
  }

  return {
    id: dataAbility.key,
    name: dataAbility.name,
    description: dataAbility.description,
    cost: 1, // Default cost
    cooldown: dataAbility.cooldown_turns,
    range: range,
    targetType: targetType,
    targetingType: targetingType,
    effect: () => {
      // Process effects from JSON
      const results = dataAbility.effects.map((effect) => {
        switch (effect.type) {
          case 'damage':
            return { damageDealt: effect.value || 0 }
          case 'heal':
            return { healingDone: effect.value || 0 }
          case 'action_bonus':
            return { actionBonus: effect.value || 0 }
          case 'apply_status_effect': {
            // Map status keys to StatusType enum
            let statusType: StatusType
            switch (effect.status_key) {
              case 'on_deadline':
                statusType = StatusType.ON_DEADLINE
                break
              case 'exhausted':
                statusType = StatusType.EXHAUSTED
                break
              case 'written_up':
                statusType = StatusType.WRITTEN_UP
                break
              case 'harassed':
                statusType = StatusType.HARASSED
                break
              case 'confused':
                statusType = StatusType.CONFUSED
                break
              case 'focused':
                statusType = StatusType.FOCUSED
                break
              case 'stunned':
                statusType = StatusType.STUNNED
                break
              case 'shielded':
                statusType = StatusType.SHIELDED
                break
              case 'inspired':
                statusType = StatusType.INSPIRED
                break
              case 'increase_speed':
                statusType = StatusType.INSPIRED // Use inspired as a speed boost
                break
              case 'bleeding':
                statusType = StatusType.POISONED // Use poisoned as bleeding effect
                break
              case 'fire':
                statusType = StatusType.BURNING
                break
              default:
                statusType = StatusType.CONFUSED // Default fallback
            }
            return { statusApplied: [{ type: statusType, duration: 2 }] }
          }
          case 'cleanse_status':
            return { message: `Status effects cleansed` }
          case 'create_tile_hazard':
            // For now, just return success - tile hazards need more complex implementation
            return { message: `${dataAbility.name} creates a hazard` }
          default:
            return {}
        }
      })
      
      return {
        success: true,
        message: `${dataAbility.name} used`,
        ...results.reduce((acc: Record<string, unknown>, result: Record<string, unknown>) => ({ ...acc, ...result }), {})
      }
    },
    visualEffect: 'default',
    soundEffect: 'default',
  }
}


// Helper functions for ability system

export function getUnitAbilities(unit: Unit): Ability[] {
  // Get abilities from unit's abilities array (populated by DataManager)
  return unit.abilities.map(abilityId => getAbilityById(abilityId)).filter((ability): ability is Ability => ability !== undefined)
}

export function canUseAbility(unit: Unit, abilityId: string): boolean {
  const ability = getAbilityById(abilityId)
  if (!ability) return false
  
  // Check if unit has access to this ability
  if (!unit.abilities.includes(abilityId)) return false
  
  // Check cooldown
  const currentCooldown = unit.abilityCooldowns[abilityId] || 0
  if (currentCooldown > 0) return false
  
  // Check action cost
  if (unit.actionsRemaining < ability.cost) return false
  
  return true
}

export function getValidTargets(unit: Unit, ability: Ability, board: Tile[][], units: Unit[]): (Unit | Coordinate)[] {
  const targets: (Unit | Coordinate)[] = []
  
  switch (ability.targetType) {
    case TargetType.SELF:
      targets.push(unit)
      break
    case TargetType.ALLY:
    case TargetType.ENEMY:
      // Find units in range using the units array
      for (const targetUnit of units) {
        // Skip the caster unit
        if (targetUnit.id === unit.id) continue
        
        const distance = Math.abs(unit.position.x - targetUnit.position.x) + Math.abs(unit.position.y - targetUnit.position.y)
        if (distance <= ability.range) {
          if (ability.targetType === TargetType.ALLY && targetUnit.playerId === unit.playerId) {
            targets.push(targetUnit)
          } else if (ability.targetType === TargetType.ENEMY && targetUnit.playerId !== unit.playerId) {
            targets.push(targetUnit)
          }
        }
      }
      break
    case TargetType.TILE:
      // Find tiles in range
      for (let y = 0; y < board.length; y++) {
        for (let x = 0; x < board[y].length; x++) {
          const distance = Math.abs(unit.position.x - x) + Math.abs(unit.position.y - y)
          if (distance <= ability.range) {
            targets.push({ x, y })
          }
        }
      }
      break
  }
  
  return targets
}


