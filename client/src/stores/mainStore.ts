import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { useUnitStore, type UnitState } from './unitStore'
import { useBoardStore, type BoardState } from './boardStore'
import { usePlayerStore, type PlayerState } from './playerStore'
import { type Unit, type Coordinate, type GamePhase } from 'shared'

/**
 * Main Store
 * 
 * Combines all store slices into a unified interface.
 * This provides a single entry point for the entire application state.
 */

export interface MainStoreState {
  // Store slices
  unitStore: UnitState
  boardStore: BoardState
  playerStore: PlayerState
  
  // Cross-slice actions
  initializeGame: () => void
  resetGame: () => void
  endTurn: () => void
  startGame: () => void
  pauseGame: () => void
  resumeGame: () => void
  
  // Combined queries
  getGameState: () => {
    units: Unit[]
    board: any[][]
    players: any[]
    currentPlayerId: string
    phase: GamePhase
    turnNumber: number
  }
  
  // Victory checking
  checkVictory: () => { isVictory: boolean; winner: string | null; reason: string }
  
  // Unit actions with board validation
  moveUnit: (unitId: string, to: Coordinate) => void
  attackUnit: (attackerId: string, targetId: string) => void
  useAbility: (unitId: string, abilityId: string, target: Unit | Coordinate) => void
  captureCubicle: (unitId: string, coord: Coordinate) => void
  
  // Combined selectors
  getSelectedUnit: () => Unit | null
  getMyUnits: () => Unit[]
  getEnemyUnits: () => Unit[]
  getCurrentPlayer: () => any
  isMyTurn: (playerId: string) => boolean
  isGameOver: () => boolean
}

export const useMainStore = create<MainStoreState>()(
  subscribeWithSelector((_set, get) => ({
    // Store slices
    unitStore: useUnitStore.getState(),
    boardStore: useBoardStore.getState(),
    playerStore: usePlayerStore.getState(),
    
    // Cross-slice actions
    initializeGame: () => {
      // Initialize board
      useBoardStore.getState().createBoard()
      
      // Initialize players
      const player1 = {
        id: 'player1',
        name: 'Player 1',
        controlledCubicles: 0,
        isEliminated: false,
        score: 0
      }
      const player2 = {
        id: 'player2',
        name: 'Player 2',
        controlledCubicles: 0,
        isEliminated: false,
        score: 0
      }
      
      usePlayerStore.getState().addPlayer(player1)
      usePlayerStore.getState().addPlayer(player2)
      usePlayerStore.getState().setCurrentPlayer('player1')
      
      // Initialize units (this would typically be done by the game setup)
      // For now, we'll just set the phase
      usePlayerStore.getState().setGamePhase('DRAFTING' as GamePhase)
    },
    
    resetGame: () => {
      // Reset all stores
      useUnitStore.getState().units = []
      useUnitStore.getState().selectedUnit = null
      useBoardStore.getState().createBoard()
      usePlayerStore.getState().resetGame()
      
      // Reinitialize
      get().initializeGame()
    },
    
    endTurn: () => {
      const { unitStore, playerStore } = get()
      
      // Reset unit actions
      unitStore.resetAllUnitActions()
      
      // Check victory conditions
      const victoryResult = get().checkVictory()
      if (victoryResult.isVictory) {
        playerStore.endGame(victoryResult.winner)
        return
      }
      
      // Move to next turn
      playerStore.nextTurn()
    },
    
    startGame: () => {
      usePlayerStore.getState().startGame()
    },
    
    pauseGame: () => {
      usePlayerStore.getState().pauseGame()
    },
    
    resumeGame: () => {
      usePlayerStore.getState().resumeGame()
    },
    
    // Combined queries
    getGameState: () => {
      const { unitStore, boardStore, playerStore } = get()
      return {
        units: unitStore.units,
        board: boardStore.board,
        players: playerStore.players.map(p => ({ id: p.id, controlledCubicles: p.controlledCubicles })),
        currentPlayerId: playerStore.currentPlayerId,
        phase: playerStore.gamePhase,
        turnNumber: playerStore.turnNumber
      }
    },
    
    // Victory checking
    checkVictory: () => {
      const { unitStore, boardStore, playerStore } = get()
      return playerStore.checkVictory(boardStore.board, unitStore.units)
    },
    
    // Unit actions with board validation
    moveUnit: (unitId, to) => {
      const { unitStore, boardStore } = get()
      
      // Validate move
      const unit = unitStore.getUnitById(unitId)
      if (!unit) return
      
      if (!unitStore.isValidMove(unit, to, boardStore.board, unitStore.units)) {
        console.warn('Invalid move attempted')
        return
      }
      
      // Execute move
      unitStore.moveUnit(unitId, to)
    },
    
    attackUnit: (attackerId, targetId) => {
      const { unitStore } = get()
      
      // Validate attack
      const attacker = unitStore.getUnitById(attackerId)
      const target = unitStore.getUnitById(targetId)
      if (!attacker || !target) return
      
      if (!unitStore.isValidAttack(attacker, target, unitStore.units)) {
        console.warn('Invalid attack attempted')
        return
      }
      
      // Execute attack
      unitStore.attackUnit(attackerId, targetId)
    },
    
    useAbility: (unitId, abilityId, target) => {
      const { unitStore } = get()
      
      // Validate ability use
      const unit = unitStore.getUnitById(unitId)
      if (!unit) return
      
      // Execute ability
      unitStore.useAbility(unitId, abilityId, target)
    },
    
    captureCubicle: (unitId, coord) => {
      const { unitStore, boardStore, playerStore } = get()
      
      // Validate capture
      const unit = unitStore.getUnitById(unitId)
      if (!unit) return
      
      const tile = boardStore.getTileAt(coord.x, coord.y)
      if (!tile || tile.type !== 'CUBICLE' as any) return
      
      // Execute capture
      boardStore.captureCubicle(coord.x, coord.y, unit.playerId)
      
      // Update player cubicle count
      const currentCount = playerStore.getPlayerById(unit.playerId)?.controlledCubicles || 0
      playerStore.updatePlayerCubicles(unit.playerId, currentCount + 1)
    },
    
    // Combined selectors
    getSelectedUnit: () => {
      return get().unitStore.selectedUnit
    },
    
    getMyUnits: () => {
      const { unitStore, playerStore } = get()
      return unitStore.getMyUnits(playerStore.currentPlayerId)
    },
    
    getEnemyUnits: () => {
      const { unitStore, playerStore } = get()
      return unitStore.getEnemyUnits(playerStore.currentPlayerId)
    },
    
    getCurrentPlayer: () => {
      return get().playerStore.getCurrentPlayer()
    },
    
    isMyTurn: (playerId) => {
      return get().playerStore.isMyTurn(playerId)
    },
    
    isGameOver: () => {
      return get().playerStore.isGameOver()
    },
  }))
)

// Export individual stores for direct access when needed
export { useUnitStore, useBoardStore, usePlayerStore }

// Export selectors for performance optimization
export const mainStoreSelectors = {
  getGameState: (state: MainStoreState) => state.getGameState(),
  getSelectedUnit: (state: MainStoreState) => state.unitStore.selectedUnit,
  getMyUnits: (state: MainStoreState) => state.unitStore.getMyUnits(state.playerStore.currentPlayerId),
  getEnemyUnits: (state: MainStoreState) => state.unitStore.getEnemyUnits(state.playerStore.currentPlayerId),
  getCurrentPlayer: (state: MainStoreState) => state.playerStore.getCurrentPlayer(),
  isMyTurn: (state: MainStoreState, playerId: string) => state.playerStore.isMyTurn(playerId),
  isGameOver: (state: MainStoreState) => state.playerStore.isGameOver(),
  getBoard: (state: MainStoreState) => state.boardStore.board,
  getUnits: (state: MainStoreState) => state.unitStore.units,
  getPlayers: (state: MainStoreState) => state.playerStore.players,
  getGamePhase: (state: MainStoreState) => state.playerStore.gamePhase,
  getTurnNumber: (state: MainStoreState) => state.playerStore.turnNumber,
}
