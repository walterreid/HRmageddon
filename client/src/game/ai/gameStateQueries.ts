import { type Unit, type Coordinate, type Tile, type GamePhase, type Player } from 'shared'
import { calculatePossibleMoves, calculatePossibleTargets, findNearestUnit, findNearestCoordinate, getDistance } from '../core/movement'
import { getEnemiesInRange, getWeakestEnemyInRange, getStrongestEnemyInRange, canAttackAnyEnemy, getUnitsThatCanAttack, calculateTotalDamageToTarget, canKillTargetThisTurn } from '../core/combat'
import { getValuableCapturePoints, getCapturePointStats, checkCloseToVictory } from '../core/victory'

/**
 * Game State Query Interface
 * 
 * Provides a clean, declarative API for querying game state.
 * This abstracts the data structure from AI decision-making and makes
 * the code more readable and maintainable.
 */

export interface GameState {
  units: Unit[]
  board: Tile[][]
  players: Player[]
  currentPlayerId: string
  phase: GamePhase
  turnNumber: number
}

export interface GameStateQueries {
  // Unit queries
  getMyUnits: (state: GameState) => Unit[]
  getEnemyUnits: (state: GameState) => Unit[]
  getUnitById: (state: GameState, unitId: string) => Unit | undefined
  getUnitsByType: (state: GameState, unitType: string) => Unit[]
  getUnitsByPlayer: (state: GameState, playerId: string) => Unit[]
  
  // Movement queries
  getPossibleMoves: (state: GameState, unit: Unit) => Coordinate[]
  canUnitMove: (state: GameState, unit: Unit) => boolean
  getUnitsInRange: (state: GameState, position: Coordinate, range: number) => Unit[]
  findNearestEnemy: (state: GameState, position: Coordinate, playerId: string) => Unit | undefined
  findNearestObjective: (state: GameState, position: Coordinate, playerId: string) => Coordinate | undefined
  
  // Combat queries
  getPossibleTargets: (state: GameState, unit: Unit) => Coordinate[]
  canUnitAttack: (state: GameState, unit: Unit) => boolean
  getEnemiesInRange: (state: GameState, unit: Unit) => Unit[]
  getWeakestEnemyInRange: (state: GameState, unit: Unit) => Unit | undefined
  getStrongestEnemyInRange: (state: GameState, unit: Unit) => Unit | undefined
  canAttackAnyEnemy: (state: GameState, unit: Unit) => boolean
  getUnitsThatCanAttack: (state: GameState, target: Unit) => Unit[]
  canKillTargetThisTurn: (state: GameState, target: Unit) => boolean
  calculateTotalDamageToTarget: (state: GameState, target: Unit) => number
  
  // Strategic queries
  getValuableCapturePoints: (state: GameState, playerId: string) => Coordinate[]
  getCapturePointStats: (state: GameState) => { totalCapturePoints: number; player1Percentage: number; player2Percentage: number; unclaimed: number; victoryThreshold: number }
  isCloseToVictory: (state: GameState) => { player1Close: boolean; player2Close: boolean; stats: { totalCapturePoints: number; player1Percentage: number; player2Percentage: number; unclaimed: number; victoryThreshold: number } }
  getThreatLevel: (state: GameState, unit: Unit) => number
  getStrategicValue: (state: GameState, position: Coordinate) => number
  
  // Game state queries
  isMyTurn: (state: GameState, playerId: string) => boolean
  getGamePhase: (state: GameState) => GamePhase
  getTurnNumber: (state: GameState) => number
  isGameOver: (state: GameState) => boolean
}

/**
 * Implementation of the Game State Query Interface
 */
export const GameQueries: GameStateQueries = {
  // Unit queries
  getMyUnits: (state) => state.units.filter(unit => unit.playerId === state.currentPlayerId),
  
  getEnemyUnits: (state) => state.units.filter(unit => unit.playerId !== state.currentPlayerId),
  
  getUnitById: (state, unitId) => state.units.find(unit => unit.id === unitId),
  
  getUnitsByType: (state, unitType) => state.units.filter(unit => unit.type === unitType),
  
  getUnitsByPlayer: (state, playerId) => state.units.filter(unit => unit.playerId === playerId),
  
  // Movement queries
  getPossibleMoves: (state, unit) => calculatePossibleMoves(unit, { board: state.board, units: state.units }),
  
  canUnitMove: (_state, unit) => unit.actionsRemaining > 0 && !unit.hasMoved,
  
  getUnitsInRange: (state, position, range) => {
    return state.units.filter(unit => {
      const distance = getDistance(position, unit.position)
      return distance <= range
    })
  },
  
  findNearestEnemy: (state, position, playerId) => {
    return findNearestUnit(position, state.units, unit => unit.playerId !== playerId)
  },
  
  findNearestObjective: (state, position, playerId) => {
    const valuableCubicles = getValuableCapturePoints(state, playerId)
    return findNearestCoordinate(position, valuableCubicles)
  },
  
  // Combat queries
  getPossibleTargets: (state, unit) => calculatePossibleTargets(unit, { units: state.units }),
  
  canUnitAttack: (_state, unit) => unit.actionsRemaining > 0 && !unit.hasAttacked,
  
  getEnemiesInRange: (state, unit) => getEnemiesInRange(unit, { units: state.units }),
  
  getWeakestEnemyInRange: (state, unit) => getWeakestEnemyInRange(unit, { units: state.units }),
  
  getStrongestEnemyInRange: (state, unit) => getStrongestEnemyInRange(unit, { units: state.units }),
  
  canAttackAnyEnemy: (state, unit) => canAttackAnyEnemy(unit, { units: state.units }),
  
  getUnitsThatCanAttack: (state, target) => getUnitsThatCanAttack(target, { units: state.units }),
  
  canKillTargetThisTurn: (state, target) => canKillTargetThisTurn(target, { units: state.units }),
  
  calculateTotalDamageToTarget: (state, target) => calculateTotalDamageToTarget(target, { units: state.units }),
  
  // Strategic queries
  getValuableCapturePoints: (state, playerId) => getValuableCapturePoints(state, playerId),
  
  getCapturePointStats: (state) => getCapturePointStats(state),
  
  isCloseToVictory: (state) => checkCloseToVictory(state),
  
  getThreatLevel: (state, unit) => {
    // Calculate how threatened a unit is based on nearby enemies
    const enemiesInRange = getEnemiesInRange(unit, { units: state.units })
    const totalDamage = enemiesInRange.reduce((total, _enemy) => {
      void _enemy; // Suppress unused parameter warning
      return total + calculateTotalDamageToTarget(unit, { units: state.units })
    }, 0)
    
    // Higher threat if more damage can be dealt to this unit
    return totalDamage / Math.max(unit.hp, 1)
  },
  
  getStrategicValue: (state, position) => {
    // Calculate strategic value of a position
    let value = 0
    
    // Check if it's a capture point
    const tile = state.board[position.y]?.[position.x]
    if (tile?.type === 'CUBICLE' as any) {
      value += 10
      
      // Higher value if unclaimed or enemy-controlled
      if (!tile.owner || tile.owner !== state.currentPlayerId) {
        value += 5
      }
    }
    
    // Check proximity to enemies (for attack positioning)
    const enemies = state.units.filter(unit => unit.playerId !== state.currentPlayerId)
    const nearestEnemy = findNearestUnit(position, enemies)
    if (nearestEnemy) {
      const distance = getDistance(position, nearestEnemy.position)
      value += Math.max(0, 5 - distance) // Closer to enemies = higher value
    }
    
    // Check proximity to allies (for support positioning)
    const allies = state.units.filter(unit => unit.playerId === state.currentPlayerId)
    const nearestAlly = findNearestUnit(position, allies)
    if (nearestAlly) {
      const distance = getDistance(position, nearestAlly.position)
      value += Math.max(0, 3 - distance) // Closer to allies = higher value
    }
    
    return value
  },
  
  // Game state queries
  isMyTurn: (state, playerId) => state.currentPlayerId === playerId,
  
  getGamePhase: (state) => state.phase,
  
  getTurnNumber: (state) => state.turnNumber,
  
  isGameOver: (state) => state.phase === 'GAME_OVER' as any
}

/**
 * Convenience functions for common AI queries
 */
export const AIQueries = {
  /**
   * Get all actionable units (can move or attack)
   */
  getActionableUnits: (state: GameState) => {
    return GameQueries.getMyUnits(state).filter(unit => 
      GameQueries.canUnitMove(state, unit) || GameQueries.canUnitAttack(state, unit)
    )
  },
  
  /**
   * Get the best attack target for a unit
   */
  getBestAttackTarget: (state: GameState, unit: Unit) => {
    if (!GameQueries.canUnitAttack(state, unit)) return undefined
    
    const enemiesInRange = GameQueries.getEnemiesInRange(state, unit)
    if (enemiesInRange.length === 0) return undefined
    
    // Prioritize by: 1) Can kill this turn, 2) Lowest HP, 3) Highest threat
    return enemiesInRange.sort((a, b) => {
      const canKillA = GameQueries.canKillTargetThisTurn(state, a)
      const canKillB = GameQueries.canKillTargetThisTurn(state, b)
      
      if (canKillA && !canKillB) return -1
      if (!canKillA && canKillB) return 1
      
      return a.hp - b.hp // Lower HP first
    })[0]
  },
  
  /**
   * Get the best move position for a unit
   */
  getBestMovePosition: (state: GameState, unit: Unit) => {
    if (!GameQueries.canUnitMove(state, unit)) return undefined
    
    const possibleMoves = GameQueries.getPossibleMoves(state, unit)
    if (possibleMoves.length === 0) return undefined
    
    // Find move with highest strategic value
    let bestMove = possibleMoves[0]
    let bestValue = GameQueries.getStrategicValue(state, bestMove)
    
    for (const move of possibleMoves) {
      const value = GameQueries.getStrategicValue(state, move)
      if (value > bestValue) {
        bestValue = value
        bestMove = move
      }
    }
    
    return bestMove
  },
  
  /**
   * Check if a unit should retreat (high threat, low HP)
   */
  shouldRetreat: (state: GameState, unit: Unit) => {
    const threatLevel = GameQueries.getThreatLevel(state, unit)
    const hpRatio = unit.hp / unit.maxHp
    
    // Retreat if high threat and low HP
    return threatLevel > 1.5 && hpRatio < 0.5
  },
  
  /**
   * Get the most valuable capture point to target
   */
  getMostValuableCapturePoint: (state: GameState, playerId: string) => {
    const valuablePoints = GameQueries.getValuableCapturePoints(state, playerId)
    if (valuablePoints.length === 0) return undefined
    
    // Find the one with highest strategic value
    let bestPoint = valuablePoints[0]
    let bestValue = GameQueries.getStrategicValue(state, bestPoint)
    
    for (const point of valuablePoints) {
      const value = GameQueries.getStrategicValue(state, point)
      if (value > bestValue) {
        bestValue = value
        bestPoint = point
      }
    }
    
    return bestPoint
  }
}
