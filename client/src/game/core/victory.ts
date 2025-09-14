import { type Unit, type Tile, TileType, type GamePhase } from 'shared'

/**
 * Pure victory condition utility functions that can be used by both the game store and AI system.
 * These functions take the required state as parameters, making them easily testable and reusable.
 */

export interface VictoryState {
  units: Unit[]
  board: Tile[][]
  players: Array<{ id: string; controlledCubicles: number }>
  phase: GamePhase
}

export interface VictoryResult {
  hasWinner: boolean
  winner?: string
  reason?: string
}

/**
 * Get cubicle data from the board (cached for performance)
 * @param board - The game board
 * @returns Object containing cubicle count and positions
 */
export function getCubicleData(board: Tile[][]) {
  const cubicles = board.flat().filter(t => t.type === TileType.CUBICLE)
  return {
    totalCubicles: cubicles.length,
    count: cubicles.length, // Keep both for compatibility
    positions: cubicles.map(t => ({ x: t.x, y: t.y }))
  }
}

/**
 * Check if a player has won by eliminating all enemy units
 * @param state - The current game state
 * @returns VictoryResult indicating if there's a winner
 */
export function checkEliminationVictory(state: VictoryState): VictoryResult {
  const p1Units = state.units.filter((u) => u.playerId === 'player1' && u.hp > 0)
  const p2Units = state.units.filter((u) => u.playerId === 'player2' && u.hp > 0)

  if (p1Units.length === 0) {
    return {
      hasWinner: true,
      winner: 'player2',
      reason: 'Player 1 has no units left'
    }
  }

  if (p2Units.length === 0) {
    return {
      hasWinner: true,
      winner: 'player1',
      reason: 'Player 2 has no units left'
    }
  }

  return { hasWinner: false }
}

/**
 * Check if a player has won by controlling 51% of capture points
 * @param state - The current game state
 * @returns VictoryResult indicating if there's a winner
 */
export function checkCapturePointVictory(state: VictoryState): VictoryResult {
  const cubicleData = getCubicleData(state.board)
  const totalCapturePoints = cubicleData.count

  if (totalCapturePoints === 0) {
    return { hasWinner: false }
  }

  const VICTORY_THRESHOLD = Math.ceil(totalCapturePoints * 0.51) // 51% rule
  
  for (const player of state.players) {
    if (player.controlledCubicles >= VICTORY_THRESHOLD) {
      return {
        hasWinner: true,
        winner: player.id,
        reason: `Player ${player.id} controls ${player.controlledCubicles}/${totalCapturePoints} capture points (>= ${VICTORY_THRESHOLD})`
      }
    }
  }

  return { hasWinner: false }
}

/**
 * Check all victory conditions
 * @param state - The current game state
 * @returns VictoryResult indicating if there's a winner and why
 */
export function checkVictoryConditions(state: VictoryState): VictoryResult {
  // Check elimination victory first (immediate)
  const eliminationResult = checkEliminationVictory(state)
  if (eliminationResult.hasWinner) {
    return eliminationResult
  }

  // Check capture point victory (51% rule)
  const captureResult = checkCapturePointVictory(state)
  if (captureResult.hasWinner) {
    return captureResult
  }

  return { hasWinner: false }
}

/**
 * Get the current capture point ownership distribution
 * @param state - The current game state
 * @returns Object with capture point statistics
 */
export function getCapturePointStats(state: VictoryState) {
  const cubicleData = getCubicleData(state.board)
  const totalCapturePoints = cubicleData.count

  const stats = {
    totalCapturePoints,
    player1Controlled: state.players.find(p => p.id === 'player1')?.controlledCubicles || 0,
    player2Controlled: state.players.find(p => p.id === 'player2')?.controlledCubicles || 0,
    unclaimed: totalCapturePoints - (state.players.reduce((sum, p) => sum + p.controlledCubicles, 0))
  }

  return {
    ...stats,
    player1Percentage: totalCapturePoints > 0 ? (stats.player1Controlled / totalCapturePoints) * 100 : 0,
    player2Percentage: totalCapturePoints > 0 ? (stats.player2Controlled / totalCapturePoints) * 100 : 0,
    victoryThreshold: totalCapturePoints > 0 ? Math.ceil(totalCapturePoints * 0.51) : 0
  }
}

/**
 * Check if a player is close to victory (within 2 capture points of winning)
 * @param state - The current game state
 * @returns Object indicating if any player is close to victory
 */
export function checkCloseToVictory(state: VictoryState) {
  const stats = getCapturePointStats(state)
  
  return {
    player1Close: stats.player1Controlled >= stats.victoryThreshold - 2,
    player2Close: stats.player2Controlled >= stats.victoryThreshold - 2,
    stats
  }
}

/**
 * Get the most valuable capture points (unclaimed or enemy-controlled)
 * @param state - The current game state
 * @param playerId - The player to check for
 * @returns Array of coordinates for valuable capture points
 */
export function getValuableCapturePoints(state: VictoryState, playerId: string) {
  const cubicleData = getCubicleData(state.board)
  
  return cubicleData.positions.filter(coord => {
    const tile = state.board[coord.y]?.[coord.x]
    if (!tile || tile.type !== TileType.CUBICLE) return false
    
    // Valuable if unclaimed or controlled by enemy
    return !tile.owner || tile.owner !== playerId
  })
}
