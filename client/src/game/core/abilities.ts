import { type Unit, StatusType, UnitType, type Coordinate, type Ability, TargetType, AbilityTargetingType, type Tile, type DataAbility } from 'shared'
import { dataManager } from '../data/DataManager'

// Get ability from DataManager or fallback to legacy
export function getAbilityById(id: string): Ability | undefined {
  const dataAbility = dataManager.getAbility(id)
  if (dataAbility) {
    return convertDataAbilityToLegacyAbility(dataAbility)
  }
  return ABILITIES[id]
}

// Convert DataAbility to legacy Ability format
function convertDataAbilityToLegacyAbility(dataAbility: DataAbility): Ability {
  // Determine target type from effects
  let targetType: TargetType = TargetType.ENEMY // Default
  if (dataAbility.effects.some(e => e.target === 'ally')) {
    targetType = TargetType.ALLY
  } else if (dataAbility.effects.some(e => e.target === 'self')) {
    targetType = TargetType.SELF
  }

  // Determine range from range_pattern_key
  let range = 1 // Default
  if (dataAbility.range_pattern_key === 'centered_cross_burst') {
    range = 1 // Cross pattern is 1 tile in each direction
  } else if (dataAbility.range_pattern_key === 'forward_cone') {
    range = 3 // Cone abilities typically have longer range
  } else if (dataAbility.range_pattern_key === 'firewall_line') {
    range = 4 // Firewall can be placed at distance
  }

  // Determine targeting type from range pattern
  let targetingType = AbilityTargetingType.SINGLE_TARGET
  if (dataAbility.range_pattern_key === 'forward_cone') {
    targetingType = AbilityTargetingType.AOE_CONE
  } else if (dataAbility.range_pattern_key === 'centered_cross_burst') {
    targetingType = AbilityTargetingType.AOE_CIRCLE
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
          case 'apply_status_effect': {
            // Map status keys to StatusType enum
            let statusType: StatusType
            switch (effect.status_key) {
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

// Legacy abilities for backward compatibility during transition
export const ABILITIES: Record<string, Ability> = {
  // Intern abilities
  fetch_coffee: {
    id: 'fetch_coffee',
    name: 'Fetch Coffee',
    description: 'Grant "On Deadline" to an adjacent ally',
    cost: 0,
    cooldown: 1,
    range: 1,
    targetType: TargetType.ALLY,
    targetingType: AbilityTargetingType.SINGLE_TARGET,
    effect: (caster, target) => {
      const t = target as Unit | undefined
      if (!t || t.playerId !== caster.playerId) return { success: false, message: 'Must target an ally' }
      return { success: true, statusApplied: [{ type: StatusType.ON_DEADLINE, duration: 2 }], message: 'On Deadline granted' }
    },
    visualEffect: 'coffee_steam',
    soundEffect: 'coffee_pour',
  },
  overtime: {
    id: 'overtime',
    name: 'Overtime',
    description: 'Gain +1 action but become Exhausted next turn',
    cost: 1,
    cooldown: 2,
    range: 0,
    targetType: TargetType.SELF,
    targetingType: AbilityTargetingType.SELF_BUFF,
    effect: () => ({ 
      success: true, 
      actionBonus: 1, 
      statusApplied: [{ type: StatusType.EXHAUSTED, duration: 1 }], 
      message: 'Working overtime' 
    }),
    visualEffect: 'overtime_glow',
    soundEffect: 'clock_tick',
  },

  // Secretary abilities
  file_it: {
    id: 'file_it',
    name: 'File It',
    description: 'Apply "Written Up" to target',
    cost: 1,
    cooldown: 2,
    range: 3,
    targetType: TargetType.ENEMY,
    targetingType: AbilityTargetingType.SINGLE_TARGET,
    effect: (caster, target) => {
      const t = target as Unit | undefined
      if (!t || t.playerId === caster.playerId) return { success: false, message: 'Must target an enemy' }
      return { success: true, statusApplied: [{ type: StatusType.WRITTEN_UP, duration: 2 }], message: 'Written up!' }
    },
    visualEffect: 'paper_flying',
    soundEffect: 'paper_rustle',
  },

  // Sales Rep abilities
  harass: {
    id: 'harass',
    name: 'Harass',
    description: 'Apply "Harassed" status preventing capture',
    cost: 1,
    cooldown: 1,
    range: 2,
    targetType: TargetType.ENEMY,
    targetingType: AbilityTargetingType.SINGLE_TARGET,
    effect: (caster, target) => {
      const t = target as Unit | undefined
      if (!t || t.playerId === caster.playerId) return { success: false, message: 'Must target an enemy' }
      return { success: true, statusApplied: [{ type: StatusType.HARASSED, duration: 2 }], message: 'Harassed!' }
    },
    visualEffect: 'harass_aura',
    soundEffect: 'phone_ring',
  },


  // HR Manager abilities
  pink_slip: {
    id: 'pink_slip',
    name: 'Pink Slip',
    description: 'Execute an adjacent enemy at ≤2 HP',
    cost: 2,
    cooldown: -1, // One-time use
    range: 1,
    targetType: TargetType.ENEMY,
    targetingType: AbilityTargetingType.SINGLE_TARGET,
    effect: (caster, target) => {
      const t = target as Unit | undefined
      if (!t || t.playerId === caster.playerId) return { success: false, message: 'Must target an enemy' }
      if (t.hp > 2) return { success: false, message: 'Target has too much HP' }
      return { success: true, damageDealt: t.hp, message: 'Terminated!' }
    },
    visualEffect: 'pink_slip_flash',
    soundEffect: 'paper_tear',
  },
  mediation: {
    id: 'mediation',
    name: 'Mediation',
    description: 'Cleanse status and heal 1 HP',
    cost: 1,
    cooldown: 2,
    range: 1,
    targetType: TargetType.ALLY,
    targetingType: AbilityTargetingType.SINGLE_TARGET,
    effect: (caster, target) => {
      const t = target as Unit | undefined
      if (!t || t.playerId !== caster.playerId) return { success: false, message: 'Must target an ally' }
      return { success: true, healingDone: 1, message: 'Mediation successful' }
    },
    visualEffect: 'peace_aura',
    soundEffect: 'gentle_chime',
  },

  // IT Specialist abilities
  hack_system: {
    id: 'hack_system',
    name: 'Hack System',
    description: 'Apply "Confused" status to enemy',
    cost: 1,
    cooldown: 2,
    range: 3,
    targetType: TargetType.ENEMY,
    targetingType: AbilityTargetingType.SINGLE_TARGET,
    effect: (caster, target) => {
      const t = target as Unit | undefined
      if (!t || t.playerId === caster.playerId) return { success: false, message: 'Must target an enemy' }
      return { success: true, statusApplied: [{ type: StatusType.CONFUSED, duration: 2 }], message: 'System hacked!' }
    },
    visualEffect: 'hack_glitch',
    soundEffect: 'keyboard_clack',
  },
  tech_support: {
    id: 'tech_support',
    name: 'Tech Support',
    description: 'Remove negative status from ally',
    cost: 1,
    cooldown: 2,
    range: 2,
    targetType: TargetType.ALLY,
    targetingType: AbilityTargetingType.SINGLE_TARGET,
    effect: (caster, target) => {
      const t = target as Unit | undefined
      if (!t || t.playerId !== caster.playerId) return { success: false, message: 'Must target an ally' }
      return { success: true, message: 'Tech support provided' }
    },
    visualEffect: 'tech_repair',
    soundEffect: 'computer_beep',
  },

  // Accountant abilities
  audit: {
    id: 'audit',
    name: 'Audit',
    description: 'Apply "Focused" status to self',
    cost: 1,
    cooldown: 2,
    range: 0,
    targetType: TargetType.SELF,
    targetingType: AbilityTargetingType.SELF_BUFF,
    effect: () => ({ 
      success: true, 
      statusApplied: [{ type: StatusType.FOCUSED, duration: 2 }], 
      message: 'Audit completed' 
    }),
    visualEffect: 'audit_glow',
    soundEffect: 'calculator_tap',
  },
  creative_accounting: {
    id: 'creative_accounting',
    name: 'Creative Accounting',
    description: 'Gain +1 action this turn',
    cost: 2,
    cooldown: 3,
    range: 0,
    targetType: TargetType.SELF,
    targetingType: AbilityTargetingType.SELF_BUFF,
    effect: () => ({ 
      success: true, 
      actionBonus: 1, 
      message: 'Creative accounting successful' 
    }),
    visualEffect: 'money_sparkle',
    soundEffect: 'cash_register',
  },

  // Legal Counsel abilities
  legal_threat: {
    id: 'legal_threat',
    name: 'Legal Threat',
    description: 'Apply "Stunned" status to enemy',
    cost: 2,
    cooldown: 3,
    range: 3,
    targetType: TargetType.ENEMY,
    targetingType: AbilityTargetingType.SINGLE_TARGET,
    effect: (caster, target) => {
      const t = target as Unit | undefined
      if (!t || t.playerId === caster.playerId) return { success: false, message: 'Must target an enemy' }
      return { success: true, statusApplied: [{ type: StatusType.STUNNED, duration: 1 }], message: 'Legal threat delivered!' }
    },
    visualEffect: 'legal_document',
    soundEffect: 'gavel_bang',
  },
  contract_negotiation: {
    id: 'contract_negotiation',
    name: 'Contract Negotiation',
    description: 'Apply "Shielded" status to ally',
    cost: 1,
    cooldown: 2,
    range: 2,
    targetType: TargetType.ALLY,
    targetingType: AbilityTargetingType.SINGLE_TARGET,
    effect: (caster, target) => {
      const t = target as Unit | undefined
      if (!t || t.playerId !== caster.playerId) return { success: false, message: 'Must target an ally' }
      return { success: true, statusApplied: [{ type: StatusType.SHIELDED, duration: 2 }], message: 'Contract negotiated!' }
    },
    visualEffect: 'shield_aura',
    soundEffect: 'pen_signature',
  },

  // Executive abilities
  executive_order: {
    id: 'executive_order',
    name: 'Executive Order',
    description: 'Apply "Inspired" to all allies',
    cost: 3,
    cooldown: 4,
    range: 0,
    targetType: TargetType.ALL_ALLIES,
    targetingType: AbilityTargetingType.ALL_ALLIES,
    effect: () => ({ 
      success: true, 
      statusApplied: [{ type: StatusType.INSPIRED, duration: 2 }], 
      message: 'Executive order issued!' 
    }),
    visualEffect: 'executive_aura',
    soundEffect: 'executive_bell',
  },
  corporate_restructuring: {
    id: 'corporate_restructuring',
    name: 'Corporate Restructuring',
    description: 'Deal 2 damage to all enemies in range',
    cost: 3,
    cooldown: 4,
    range: 3,
    targetType: TargetType.ALL_ENEMIES,
    targetingType: AbilityTargetingType.ALL_ENEMIES,
    effect: () => ({ 
      success: true, 
      damageDealt: 2, 
      message: 'Corporate restructuring initiated!' 
    }),
    visualEffect: 'restructure_blast',
    soundEffect: 'office_chaos',
  },
  paperclip_storm: {
    id: 'paperclip_storm',
    name: 'Paperclip Storm',
    description: 'Launch a storm of paperclips in a cone direction',
    cost: 2,
    cooldown: 3,
    range: 4,
    targetType: TargetType.ENEMY,
    targetingType: AbilityTargetingType.AOE_CONE,
    requiresDirection: true, // New property for directional abilities
    coneAngle: 90, // Cone angle in degrees
    effect: () => ({ 
      success: true, 
      damage: 1, 
      message: 'Paperclip storm unleashed!' 
    }),
    visualEffect: 'paperclip_storm',
    soundEffect: 'paperclip_clatter',
  },
}

// Unit ability mappings
export const UNIT_ABILITIES: Record<UnitType, string[]> = {
  [UnitType.INTERN]: ['fetch_coffee', 'overtime'],
  [UnitType.SECRETARY]: ['file_it'],
  [UnitType.SALES_REP]: ['harass'],
  [UnitType.HR_MANAGER]: ['pink_slip', 'mediation'],
  [UnitType.IT_SPECIALIST]: ['hack_system', 'tech_support'],
  [UnitType.ACCOUNTANT]: ['audit', 'creative_accounting'],
  [UnitType.LEGAL_COUNSEL]: ['legal_threat', 'contract_negotiation'],
  [UnitType.EXECUTIVE]: ['executive_order', 'corporate_restructuring', 'paperclip_storm'],
}

// Helper functions for ability system

export function getUnitAbilities(unit: Unit): Ability[] {
  // Get abilities from unit's abilities array (now stored from employee data)
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


