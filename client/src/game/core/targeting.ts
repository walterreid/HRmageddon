import { type Unit, type Coordinate, type Ability, type Tile } from 'shared'

/**
 * Core targeting logic for complex targeting patterns like cones, lines, and areas
 * This module contains pure functions for determining valid targets based on
 * different targeting patterns and ranges.
 */

export interface TargetingContext {
  source: Unit
  ability: Ability
  board: Tile[][]
  units: Unit[]
}

export interface TargetingResult {
  validTargets: (Unit | Coordinate)[]
  invalidTargets: (Unit | Coordinate)[]
  reason?: string
}

/**
 * Get all valid targets for a given ability and targeting pattern
 */
export function getValidTargets(
  context: TargetingContext,
  pattern: 'single' | 'line' | 'cone' | 'area' | 'self'
): TargetingResult {
  const { source: _source, ability: _ability, board: _board, units: _units } = context
  void _source; void _ability; void _board; void _units; // Suppress unused variable warnings
  
  switch (pattern) {
    case 'single':
      return getSingleTargets(context)
    case 'line':
      return getLineTargets(context)
    case 'cone':
      return getConeTargets(context)
    case 'area':
      return getAreaTargets(context)
    case 'self':
      return getSelfTargets(context)
    default:
      return { validTargets: [], invalidTargets: [], reason: 'Unknown targeting pattern' }
  }
}

/**
 * Single target selection - any unit or coordinate within range
 */
function getSingleTargets(context: TargetingContext): TargetingResult {
  const { source, ability, board, units } = context
  const validTargets: (Unit | Coordinate)[] = []
  const invalidTargets: (Unit | Coordinate)[] = []
  
  // Check range
  const range = ability.range || 1
  
  for (const unit of units) {
    if (unit.id === source.id) continue // Can't target self for single target
    
    const distance = getDistance(source.position, unit.position)
    if (distance <= range) {
      validTargets.push(unit)
    } else {
      invalidTargets.push(unit)
    }
  }
  
  // Add empty coordinates within range
  for (let x = 0; x < board[0].length; x++) {
    for (let y = 0; y < board.length; y++) {
      const distance = getDistance(source.position, { x, y })
      if (distance <= range) {
        // Check if this coordinate is empty
        const isEmpty = !units.some(unit => 
          unit.position.x === x && unit.position.y === y
        )
        if (isEmpty) {
          validTargets.push({ x, y })
        }
      }
    }
  }
  
  return { validTargets, invalidTargets }
}

/**
 * Line targeting - targets in a straight line from source
 */
function getLineTargets(context: TargetingContext): TargetingResult {
  const { source, ability, board, units } = context
  const validTargets: (Unit | Coordinate)[] = []
  const invalidTargets: (Unit | Coordinate)[] = []
  
  const range = ability.range || 1
  const directions = [
    { x: 1, y: 0 },   // Right
    { x: -1, y: 0 },  // Left
    { x: 0, y: 1 },   // Down
    { x: 0, y: -1 },  // Up
    { x: 1, y: 1 },   // Down-Right
    { x: -1, y: 1 },  // Down-Left
    { x: 1, y: -1 },  // Up-Right
    { x: -1, y: -1 }  // Up-Left
  ]
  
  for (const direction of directions) {
    for (let distance = 1; distance <= range; distance++) {
      const targetX = source.position.x + (direction.x * distance)
      const targetY = source.position.y + (direction.y * distance)
      
      // Check bounds
      if (targetX < 0 || targetX >= board[0].length || 
          targetY < 0 || targetY >= board.length) {
        break
      }
      
      const targetPos = { x: targetX, y: targetY }
      
      // Check if there's a unit at this position
      const unitAtPosition = units.find(unit => 
        unit.position.x === targetX && unit.position.y === targetY
      )
      
      if (unitAtPosition) {
        validTargets.push(unitAtPosition)
        break // Line stops at first unit
      } else {
        validTargets.push(targetPos)
      }
    }
  }
  
  return { validTargets, invalidTargets }
}

/**
 * Cone targeting - targets in a cone shape from source
 */
function getConeTargets(context: TargetingContext): TargetingResult {
  const { source, ability, board, units } = context
  const validTargets: (Unit | Coordinate)[] = []
  const invalidTargets: (Unit | Coordinate)[] = []
  
  const range = ability.range || 1
  const coneWidth = (ability as Ability & { coneWidth?: number }).coneWidth || 1
  
  // For simplicity, implement a basic cone pattern
  // In a real implementation, you'd want more sophisticated cone math
  for (let distance = 1; distance <= range; distance++) {
    for (let offset = -coneWidth; offset <= coneWidth; offset++) {
      const targetX = source.position.x + distance
      const targetY = source.position.y + offset
      
      // Check bounds
      if (targetX < 0 || targetX >= board[0].length || 
          targetY < 0 || targetY >= board.length) {
        continue
      }
      
      const targetPos = { x: targetX, y: targetY }
      
      // Check if there's a unit at this position
      const unitAtPosition = units.find(unit => 
        unit.position.x === targetX && unit.position.y === targetY
      )
      
      if (unitAtPosition) {
        validTargets.push(unitAtPosition)
      } else {
        validTargets.push(targetPos)
      }
    }
  }
  
  return { validTargets, invalidTargets }
}

/**
 * Area targeting - targets in an area around a point
 */
function getAreaTargets(context: TargetingContext): TargetingResult {
  const { source, ability, board, units } = context
  const validTargets: (Unit | Coordinate)[] = []
  const invalidTargets: (Unit | Coordinate)[] = []
  
  const range = ability.range || 1
  // const _areaSize = (ability as Ability & { areaSize?: number }).areaSize || 1 // Currently unused
  
  // Check all positions within range
  for (let x = 0; x < board[0].length; x++) {
    for (let y = 0; y < board.length; y++) {
      const distance = getDistance(source.position, { x, y })
      if (distance <= range) {
        const targetPos = { x, y }
        
        // Check if there's a unit at this position
        const unitAtPosition = units.find(unit => 
          unit.position.x === x && unit.position.y === y
        )
        
        if (unitAtPosition) {
          validTargets.push(unitAtPosition)
        } else {
          validTargets.push(targetPos)
        }
      }
    }
  }
  
  return { validTargets, invalidTargets }
}

/**
 * Self targeting - can only target the source unit
 */
function getSelfTargets(context: TargetingContext): TargetingResult {
  const { source } = context
  return {
    validTargets: [source],
    invalidTargets: []
  }
}

/**
 * Calculate Manhattan distance between two coordinates
 */
function getDistance(pos1: Coordinate, pos2: Coordinate): number {
  return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y)
}

/**
 * Check if a target is valid for a specific ability
 */
export function isValidTarget(
  source: Unit,
  target: Unit | Coordinate,
  ability: Ability,
  board: Tile[][],
  units: Unit[]
): boolean {
  const context: TargetingContext = { source, ability, board, units }
  
  // Check if target is friendly for enemy-only abilities
  if ('id' in target && ability.targetType === 'enemy') {
    if (target.playerId === source.playerId) {
      return false // Can't target friendly units with enemy-only abilities
    }
  }
  
  // Check if target is enemy for ally-only abilities
  if ('id' in target && ability.targetType === 'ally') {
    if (target.playerId !== source.playerId) {
      return false // Can't target enemy units with ally-only abilities
    }
  }
  
  // Determine targeting pattern based on ability
  const pattern = (ability as Ability & { targetingPattern?: 'self' | 'single' | 'line' | 'cone' | 'area' }).targetingPattern || 'single'
  const result = getValidTargets(context, pattern)
  
  return result.validTargets.some(validTarget => 
    'id' in target ? 
      'id' in validTarget && validTarget.id === target.id :
      'x' in validTarget && validTarget.x === target.x && validTarget.y === target.y
  )
}

/**
 * Calculates tiles within a cone defined by a direction vector
 * Used for directional abilities like paperclip_storm
 */
export function getTilesInCone(
  casterPosition: Coordinate,
  direction: Coordinate,
  range: number,
  coneAngleDegrees: number
): Coordinate[] {
  const affectedTiles: Coordinate[] = []
  const coneAngleRadians = (coneAngleDegrees / 2) * (Math.PI / 180)

  // Normalize the direction vector
  const mag = Math.sqrt(direction.x * direction.x + direction.y * direction.y)
  if (mag === 0) return [] // Avoid division by zero
  const normDir = { x: direction.x / mag, y: direction.y / mag }

  // Check all tiles within a bounding box of the range
  for (let x = casterPosition.x - range; x <= casterPosition.x + range; x++) {
    for (let y = casterPosition.y - range; y <= casterPosition.y + range; y++) {
      const distance = Math.abs(x - casterPosition.x) + Math.abs(y - casterPosition.y) // Manhattan distance
      if (distance > range || (x === casterPosition.x && y === casterPosition.y)) continue

      const vectorToTarget = { x: x - casterPosition.x, y: y - casterPosition.y }
      const magTarget = Math.sqrt(vectorToTarget.x * vectorToTarget.x + vectorToTarget.y * vectorToTarget.y)
      if (magTarget === 0) continue

      // Calculate dot product to find the angle between the direction and the target
      const dotProduct = (normDir.x * vectorToTarget.x + normDir.y * vectorToTarget.y) / magTarget
      const angle = Math.acos(Math.max(-1, Math.min(1, dotProduct))) // Angle in radians, clamp to avoid NaN

      if (angle <= coneAngleRadians) {
        affectedTiles.push({ x, y })
      }
    }
  }
  return affectedTiles
}
