import { type Unit, type Tile, type Coordinate, TileType } from 'shared'
import { mapRegistry } from '../map/MapRegistry'

/**
 * Pure movement utility functions that can be used by both the game store and AI system.
 * These functions take the required state as parameters, making them easily testable and reusable.
 */

export interface MovementState {
  board: Tile[][]
  units: Unit[]
}

export interface CombatState {
  units: Unit[]
}

/**
 * Calculate all possible moves for a unit using BFS algorithm
 * @param unit - The unit to calculate moves for
 * @param state - The current game state (board and units)
 * @returns Array of valid move coordinates
 */
export function calculatePossibleMoves(unit: Unit, state: MovementState): Coordinate[] {
  if (unit.remainingMovement <= 0 || unit.actionsRemaining === 0) return []

  const { board, units } = state
  const moves: Coordinate[] = []
  const visited = new Set<string>()
  const queue: { coord: Coordinate; distance: number }[] = [{ coord: unit.position, distance: 0 }]

  // Get blocked tiles from MapRegistry for additional movement validation
  const blockedTiles = mapRegistry.getBlockedTiles('OfficeLayout') || []
  const blockedSet = new Set(blockedTiles.map(t => `${t.x},${t.y}`))

  while (queue.length > 0) {
    const { coord, distance } = queue.shift()!
    const key = `${coord.x},${coord.y}`
    if (visited.has(key)) continue
    visited.add(key)

    if (distance > 0 && distance <= unit.remainingMovement) {
      const tile = board[coord.y]?.[coord.x]
      const occupant = units.find((u) => u.position.x === coord.x && u.position.y === coord.y)
      const isBlockedByTilemap = blockedSet.has(`${coord.x},${coord.y}`)
      
      // Check both board tile type and tilemap blocked status
      if (tile && tile.type !== TileType.OBSTACLE && !occupant && !isBlockedByTilemap) {
        moves.push(coord)
      }
    }

    if (distance < unit.remainingMovement) {
      const neighbors = [
        { x: coord.x + 1, y: coord.y },
        { x: coord.x - 1, y: coord.y },
        { x: coord.x, y: coord.y + 1 },
        { x: coord.x, y: coord.y - 1 },
      ]
      for (const neighbor of neighbors) {
        if (
          neighbor.x >= 0 &&
          neighbor.x < board[0].length &&
          neighbor.y >= 0 &&
          neighbor.y < board.length
        ) {
          queue.push({ coord: neighbor, distance: distance + 1 })
        }
      }
    }
  }
  
  console.log('Movement calculation for unit:', {
    unitId: unit.id,
    position: unit.position,
    moveRange: unit.moveRange,
    remainingMovement: unit.remainingMovement,
    totalMoves: moves.length,
    blockedTilesCount: blockedTiles.length,
    boardObstacles: board.flat().filter(t => t.type === TileType.OBSTACLE).length
  })
  
  return moves
}

/**
 * Check if a move is valid for a unit
 * @param unit - The unit attempting to move
 * @param to - The destination coordinate
 * @param state - The current game state
 * @returns True if the move is valid
 */
export function isValidMove(unit: Unit, to: Coordinate, state: MovementState): boolean {
  const possibleMoves = calculatePossibleMoves(unit, state)
  return possibleMoves.some((m) => m.x === to.x && m.y === to.y)
}

/**
 * Get all units within a specific range of a position
 * @param position - The center position
 * @param range - The range to search within
 * @param units - Array of units to search through
 * @returns Array of units within range
 */
export function getUnitsInRange(position: Coordinate, range: number, units: Unit[]): Unit[] {
  return units.filter(unit => {
    const distance = Math.abs(unit.position.x - position.x) + Math.abs(unit.position.y - position.y)
    return distance <= range
  })
}

/**
 * Get the distance between two coordinates using Manhattan distance
 * @param from - Starting coordinate
 * @param to - Target coordinate
 * @returns Manhattan distance between the coordinates
 */
export function getDistance(from: Coordinate, to: Coordinate): number {
  return Math.abs(to.x - from.x) + Math.abs(to.y - from.y)
}

/**
 * Calculate the direction from one coordinate to another
 * @param from - Starting coordinate
 * @param to - Target coordinate
 * @returns Direction as 'up', 'down', 'left', or 'right'
 */
export function getDirection(from: Coordinate, to: Coordinate): 'up' | 'down' | 'left' | 'right' {
  const dx = to.x - from.x
  const dy = to.y - from.y
  
  // If no movement, return current direction or default
  if (dx === 0 && dy === 0) return 'down'
  
  // Determine primary direction based on larger delta
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? 'right' : 'left'
  } else {
    return dy > 0 ? 'down' : 'up'
  }
}

/**
 * Find the nearest unit to a given position
 * @param position - The reference position
 * @param units - Array of units to search through
 * @param filter - Optional filter function to exclude certain units
 * @returns The nearest unit, or undefined if none found
 */
export function findNearestUnit(
  position: Coordinate, 
  units: Unit[], 
  filter?: (unit: Unit) => boolean
): Unit | undefined {
  const filteredUnits = filter ? units.filter(filter) : units
  if (filteredUnits.length === 0) return undefined

  let nearest = filteredUnits[0]
  let nearestDistance = getDistance(position, nearest.position)

  for (let i = 1; i < filteredUnits.length; i++) {
    const distance = getDistance(position, filteredUnits[i].position)
    if (distance < nearestDistance) {
      nearest = filteredUnits[i]
      nearestDistance = distance
    }
  }

  return nearest
}

/**
 * Find the nearest coordinate to a given position from a list of coordinates
 * @param position - The reference position
 * @param coordinates - Array of coordinates to search through
 * @returns The nearest coordinate, or undefined if none found
 */
export function findNearestCoordinate(
  position: Coordinate, 
  coordinates: Coordinate[]
): Coordinate | undefined {
  if (coordinates.length === 0) return undefined

  let nearest = coordinates[0]
  let nearestDistance = getDistance(position, nearest)

  for (let i = 1; i < coordinates.length; i++) {
    const distance = getDistance(position, coordinates[i])
    if (distance < nearestDistance) {
      nearest = coordinates[i]
      nearestDistance = distance
    }
  }

  return nearest
}

export function calculatePossibleTargets(unit: Unit, state: CombatState): Coordinate[] {
  const targets: Coordinate[] = []
  
  for (const enemy of state.units) {
    if (enemy.playerId === unit.playerId) continue
    
    const distance = getDistance(unit.position, enemy.position)
    if (distance <= unit.attackRange) {
      targets.push(enemy.position)
    }
  }
  
  return targets
}
