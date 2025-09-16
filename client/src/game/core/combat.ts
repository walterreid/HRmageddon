import { type Unit, type Coordinate } from 'shared'

/**
 * Pure combat utility functions that can be used by both the game store and AI system.
 * These functions take the required state as parameters, making them easily testable and reusable.
 */

export interface CombatState {
  units: Unit[]
}

/**
 * Calculate all possible attack targets for a unit
 * @param unit - The unit to calculate targets for
 * @param state - The current game state (units)
 * @returns Array of valid target coordinates
 */
export function calculatePossibleTargets(unit: Unit, state: CombatState): Coordinate[] {
  if (unit.hasAttacked || unit.actionsRemaining === 0) return []
  
  const { units } = state
  const targets: Coordinate[] = []
  
  for (const enemy of units) {
    if (enemy.playerId === unit.playerId) continue
    const distance = Math.abs(enemy.position.x - unit.position.x) + Math.abs(enemy.position.y - unit.position.y)
    if (distance <= unit.attackRange) {
      targets.push(enemy.position)
      console.log('Valid attack target found:', {
        targetId: enemy.id,
        targetType: enemy.type,
        distance,
        attackRange: unit.attackRange,
        targetPosition: enemy.position
      })
    }
  }
  
  console.log('Calculated possible targets for unit:', {
    unitId: unit.id,
    unitType: unit.type,
    attackRange: unit.attackRange,
    targetCount: targets.length,
    targets
  })
  
  return targets
}

/**
 * Check if an attack is valid
 * @param attacker - The attacking unit
 * @param target - The target unit
 * @param state - The current game state
 * @returns True if the attack is valid
 */
export function isValidAttack(attacker: Unit, target: Unit, state: CombatState): boolean {
  const possibleTargets = calculatePossibleTargets(attacker, state)
  return possibleTargets.some((t) => t.x === target.position.x && t.y === target.position.y)
}

/**
 * Calculate damage dealt by an attacker to a target
 * @param attacker - The attacking unit
 * @param target - The target unit
 * @returns The damage amount
 */
export function calculateDamage(attacker: Unit, target: Unit): number {
  // Base damage is the attacker's attack damage
  const baseDamage = attacker.attackDamage
  
  // Simple damage calculation - can be enhanced later
  // For now, just return the base damage, ensuring it's at least 1
  // Target parameter is available for future damage calculations based on target stats
  // Currently not using target stats, but keeping parameter for future enhancements
  void target // Suppress unused parameter warning
  
  return Math.max(1, baseDamage)
}

/**
 * Get all enemy units within attack range of a unit
 * @param unit - The attacking unit
 * @param state - The current game state
 * @returns Array of enemy units within range
 */
export function getEnemiesInRange(unit: Unit, state: CombatState): Unit[] {
  const { units } = state
  return units.filter(enemy => {
    if (enemy.playerId === unit.playerId) return false
    const distance = Math.abs(enemy.position.x - unit.position.x) + Math.abs(enemy.position.y - unit.position.y)
    return distance <= unit.attackRange
  })
}

/**
 * Find the weakest enemy within attack range
 * @param unit - The attacking unit
 * @param state - The current game state
 * @returns The weakest enemy unit, or undefined if none found
 */
export function getWeakestEnemyInRange(unit: Unit, state: CombatState): Unit | undefined {
  const enemiesInRange = getEnemiesInRange(unit, state)
  if (enemiesInRange.length === 0) return undefined

  return enemiesInRange.reduce((weakest, current) => 
    current.hp < weakest.hp ? current : weakest
  )
}

/**
 * Find the strongest enemy within attack range
 * @param unit - The attacking unit
 * @param state - The current game state
 * @returns The strongest enemy unit, or undefined if none found
 */
export function getStrongestEnemyInRange(unit: Unit, state: CombatState): Unit | undefined {
  const enemiesInRange = getEnemiesInRange(unit, state)
  if (enemiesInRange.length === 0) return undefined

  return enemiesInRange.reduce((strongest, current) => 
    current.hp > strongest.hp ? current : strongest
  )
}

/**
 * Check if a unit can attack any enemy
 * @param unit - The unit to check
 * @param state - The current game state
 * @returns True if the unit can attack any enemy
 */
export function canAttackAnyEnemy(unit: Unit, state: CombatState): boolean {
  return getEnemiesInRange(unit, state).length > 0
}

/**
 * Get all units that can attack a specific target
 * @param target - The target unit
 * @param state - The current game state
 * @returns Array of units that can attack the target
 */
export function getUnitsThatCanAttack(target: Unit, state: CombatState): Unit[] {
  const { units } = state
  return units.filter(unit => {
    if (unit.playerId === target.playerId) return false
    if (unit.hasAttacked || unit.actionsRemaining === 0) return false
    const distance = Math.abs(unit.position.x - target.position.x) + Math.abs(unit.position.y - target.position.y)
    return distance <= unit.attackRange
  })
}

/**
 * Calculate the total damage that can be dealt to a target by all possible attackers
 * @param target - The target unit
 * @param state - The current game state
 * @returns Total potential damage
 */
export function calculateTotalDamageToTarget(target: Unit, state: CombatState): number {
  const attackers = getUnitsThatCanAttack(target, state)
  return attackers.reduce((total, attacker) => total + calculateDamage(attacker, target), 0)
}

/**
 * Check if a unit can be killed in one turn by available attackers
 * @param target - The target unit
 * @param state - The current game state
 * @returns True if the target can be killed this turn
 */
export function canKillTargetThisTurn(target: Unit, state: CombatState): boolean {
  const totalDamage = calculateTotalDamageToTarget(target, state)
  return totalDamage >= target.hp
}
