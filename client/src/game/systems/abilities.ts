import { type Unit, StatusType, type StatusEffect, UnitType, type Coordinate } from 'shared'

export interface Ability {
  id: string
  name: string
  description: string
  cost: number
  cooldown: number
  currentCooldown?: number
  range: number
  targetType: TargetType
  effect: (caster: Unit, target?: Unit | Coordinate) => AbilityResult
}

export const TargetType = {
  SELF: 'self',
  ALLY: 'ally',
  ENEMY: 'enemy',
  TILE: 'tile',
  NONE: 'none',
} as const

export type TargetType = typeof TargetType[keyof typeof TargetType]

export interface AbilityResult {
  success: boolean
  message?: string
  statusApplied?: StatusEffect
  damageDealt?: number
  healingDone?: number
}

export const ABILITIES: Record<string, Ability> = {
  fetch_coffee: {
    id: 'fetch_coffee',
    name: 'Fetch Coffee',
    description: 'Grant "On Deadline" to an adjacent ally',
    cost: 0,
    cooldown: 1,
    range: 1,
    targetType: TargetType.ALLY,
    effect: (caster, target) => {
      const t = target as Unit | undefined
      if (!t || t.playerId !== caster.playerId) return { success: false, message: 'Must target an ally' }
      return { success: true, statusApplied: { type: StatusType.ON_DEADLINE, duration: 1 }, message: 'On Deadline granted' }
    },
  },
  overtime: {
    id: 'overtime',
    name: 'Overtime',
    description: 'Gain +1 action but become Exhausted next turn',
    cost: 1,
    cooldown: 2,
    range: 0,
    targetType: TargetType.SELF,
    effect: () => ({ success: true, statusApplied: { type: StatusType.ON_DEADLINE, duration: 1 }, message: 'Working overtime' }),
  },
  file_it: {
    id: 'file_it',
    name: 'File It',
    description: 'Apply "Written Up" to target',
    cost: 1,
    cooldown: 2,
    range: 3,
    targetType: TargetType.ENEMY,
    effect: (caster, target) => {
      const t = target as Unit | undefined
      if (!t || t.playerId === caster.playerId) return { success: false, message: 'Must target an enemy' }
      return { success: true, statusApplied: { type: StatusType.WRITTEN_UP, duration: 1 }, message: 'Written up!' }
    },
  },
  harass: {
    id: 'harass',
    name: 'Harass',
    description: 'Apply "Harassed" status preventing capture',
    cost: 1,
    cooldown: 1,
    range: 2,
    targetType: TargetType.ENEMY,
    effect: (caster, target) => {
      const t = target as Unit | undefined
      if (!t || t.playerId === caster.playerId) return { success: false, message: 'Must target an enemy' }
      return { success: true, statusApplied: { type: StatusType.HARASSED, duration: 1 }, message: 'Harassed!' }
    },
  },
  pink_slip: {
    id: 'pink_slip',
    name: 'Pink Slip',
    description: 'Execute an adjacent enemy at ≤2 HP',
    cost: 2,
    cooldown: -1,
    range: 1,
    targetType: TargetType.ENEMY,
    effect: (caster, target) => {
      const t = target as Unit | undefined
      if (!t || t.playerId === caster.playerId) return { success: false, message: 'Must target an enemy' }
      if (t.hp > 2) return { success: false, message: 'Target has too much HP' }
      return { success: true, damageDealt: t.hp, message: 'Terminated!' }
    },
  },
  mediation: {
    id: 'mediation',
    name: 'Mediation',
    description: 'Cleanse status and heal 1 HP',
    cost: 1,
    cooldown: 2,
    range: 1,
    targetType: TargetType.ALLY,
    effect: (caster, target) => {
      const t = target as Unit | undefined
      if (!t || t.playerId !== caster.playerId) return { success: false, message: 'Must target an ally' }
      return { success: true, healingDone: 1, message: 'Mediation successful' }
    },
  },
}

export const UNIT_ABILITIES: Record<UnitType, string[]> = {
  [UnitType.INTERN]: ['fetch_coffee', 'overtime'],
  [UnitType.SECRETARY]: ['file_it'],
  [UnitType.SALES_REP]: ['harass'],
  [UnitType.HR_MANAGER]: ['pink_slip', 'mediation'],
  [UnitType.IT_SPECIALIST]: [],
  [UnitType.ACCOUNTANT]: [],
  [UnitType.LEGAL_COUNSEL]: [],
  [UnitType.EXECUTIVE]: [],
}


