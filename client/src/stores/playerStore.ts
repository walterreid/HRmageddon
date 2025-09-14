import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { type GamePhase } from 'shared'
import { checkVictoryConditions as checkVictory } from '../game/core/victory'

/**
 * Player Store Slice
 * 
 * Manages all player and game state related data.
 * This slice handles players, game phases, turns, and victory conditions.
 */

export interface Player {
  id: string
  name: string
  controlledCubicles: number
  isEliminated: boolean
  score: number
}

export interface PlayerState {
  // Player data
  players: Player[]
  currentPlayerId: string
  gamePhase: GamePhase
  turnNumber: number
  winner: string | null
  
  // Player actions
  addPlayer: (player: Player) => void
  removePlayer: (playerId: string) => void
  updatePlayer: (playerId: string, updates: Partial<Player>) => void
  setCurrentPlayer: (playerId: string) => void
  nextTurn: () => void
  endGame: (winnerId: string | null) => void
  
  // Game phase actions
  setGamePhase: (phase: GamePhase) => void
  startGame: () => void
  pauseGame: () => void
  resumeGame: () => void
  
  // Player queries
  getPlayerById: (id: string) => Player | undefined
  getCurrentPlayer: () => Player | undefined
  getPlayerCount: () => number
  getActivePlayers: () => Player[]
  getEliminatedPlayers: () => Player[]
  
  // Game state queries
  isMyTurn: (playerId: string) => boolean
  isGameOver: () => boolean
  isGameStarted: () => boolean
  isGamePaused: () => boolean
  getGamePhase: () => GamePhase
  getTurnNumber: () => number
  getWinner: () => string | null
  
  // Victory conditions
  checkVictory: (board: any[][], units: any[]) => { isVictory: boolean; winner: string | null; reason: string }
  updatePlayerCubicles: (playerId: string, cubicleCount: number) => void
  eliminatePlayer: (playerId: string) => void
  
  // Game state helpers
  resetGame: () => void
  getGameStats: () => {
    turnNumber: number
    currentPlayer: string
    phase: GamePhase
    playerCount: number
    activePlayers: number
    eliminatedPlayers: number
  }
}

export const usePlayerStore = create<PlayerState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    players: [],
    currentPlayerId: '',
    gamePhase: 'WAITING_FOR_PLAYERS' as GamePhase,
    turnNumber: 1,
    winner: null,
    
    // Player actions
    addPlayer: (player) => {
      set((state) => ({
        players: [...state.players, player]
      }))
    },
    
    removePlayer: (playerId) => {
      set((state) => ({
        players: state.players.filter(player => player.id !== playerId)
      }))
    },
    
    updatePlayer: (playerId, updates) => {
      set((state) => ({
        players: state.players.map(player =>
          player.id === playerId ? { ...player, ...updates } : player
        )
      }))
    },
    
    setCurrentPlayer: (playerId) => {
      set({ currentPlayerId: playerId })
    },
    
    nextTurn: () => {
      set((state) => {
        const activePlayers = state.players.filter(p => !p.isEliminated)
        if (activePlayers.length === 0) return state
        
        const currentIndex = activePlayers.findIndex(p => p.id === state.currentPlayerId)
        const nextIndex = (currentIndex + 1) % activePlayers.length
        const nextPlayer = activePlayers[nextIndex]
        
        return {
          currentPlayerId: nextPlayer.id,
          turnNumber: nextIndex === 0 ? state.turnNumber + 1 : state.turnNumber
        }
      })
    },
    
    endGame: (winnerId) => {
      set({
        gamePhase: 'GAME_OVER' as any,
        winner: winnerId
      })
    },
    
    // Game phase actions
    setGamePhase: (phase) => {
      set({ gamePhase: phase })
    },
    
    startGame: () => {
      set({
        gamePhase: 'PLAYING' as any,
        turnNumber: 1,
        winner: null
      })
    },
    
    pauseGame: () => {
      set({ gamePhase: 'PAUSED' as any })
    },
    
    resumeGame: () => {
      set({ gamePhase: 'PLAYING' as any })
    },
    
    // Player queries
    getPlayerById: (id) => {
      return get().players.find(player => player.id === id)
    },
    
    getCurrentPlayer: () => {
      const { currentPlayerId, players } = get()
      return players.find(player => player.id === currentPlayerId)
    },
    
    getPlayerCount: () => {
      return get().players.length
    },
    
    getActivePlayers: () => {
      return get().players.filter(player => !player.isEliminated)
    },
    
    getEliminatedPlayers: () => {
      return get().players.filter(player => player.isEliminated)
    },
    
    // Game state queries
    isMyTurn: (playerId) => {
      return get().currentPlayerId === playerId
    },
    
    isGameOver: () => {
      return get().gamePhase === 'GAME_OVER' as any
    },
    
    isGameStarted: () => {
      return get().gamePhase === 'PLAYING' as any
    },
    
    isGamePaused: () => {
      return get().gamePhase === 'PAUSED' as any
    },
    
    getGamePhase: () => {
      return get().gamePhase
    },
    
    getTurnNumber: () => {
      return get().turnNumber
    },
    
    getWinner: () => {
      return get().winner
    },
    
    // Victory conditions
    checkVictory: (board, units) => {
      const { players } = get()
      const result = checkVictory({
        board,
        units,
        players: players.map(p => ({ id: p.id, controlledCubicles: p.controlledCubicles })),
        phase: get().gamePhase
      })
      
      if (result.hasWinner) {
        set({ winner: result.winner, gamePhase: 'GAME_OVER' as any })
      }
      
      return {
        isVictory: result.hasWinner,
        winner: result.winner || null,
        reason: result.reason || 'Unknown'
      }
    },
    
    updatePlayerCubicles: (playerId, cubicleCount) => {
      set((state) => ({
        players: state.players.map(player =>
          player.id === playerId ? { ...player, controlledCubicles: cubicleCount } : player
        )
      }))
    },
    
    eliminatePlayer: (playerId) => {
      set((state) => ({
        players: state.players.map(player =>
          player.id === playerId ? { ...player, isEliminated: true } : player
        )
      }))
    },
    
    // Game state helpers
    resetGame: () => {
      set({
        players: [],
        currentPlayerId: '',
        gamePhase: 'WAITING_FOR_PLAYERS' as GamePhase,
        turnNumber: 1,
        winner: null
      })
    },
    
    getGameStats: () => {
      const { players, currentPlayerId, gamePhase, turnNumber } = get()
      const activePlayers = players.filter(p => !p.isEliminated)
      const eliminatedPlayers = players.filter(p => p.isEliminated)
      
      return {
        turnNumber,
        currentPlayer: currentPlayerId,
        phase: gamePhase,
        playerCount: players.length,
        activePlayers: activePlayers.length,
        eliminatedPlayers: eliminatedPlayers.length
      }
    },
  }))
)

// Selectors for performance optimization
export const playerSelectors = {
  getCurrentPlayer: (state: PlayerState) => state.players.find(p => p.id === state.currentPlayerId),
  getActivePlayers: (state: PlayerState) => state.players.filter(p => !p.isEliminated),
  getEliminatedPlayers: (state: PlayerState) => state.players.filter(p => p.isEliminated),
  isMyTurn: (state: PlayerState, playerId: string) => state.currentPlayerId === playerId,
  isGameOver: (state: PlayerState) => state.gamePhase === 'GAME_OVER' as any,
  isGameStarted: (state: PlayerState) => state.gamePhase === 'PLAYING' as any,
  isGamePaused: (state: PlayerState) => state.gamePhase === 'PAUSED' as any,
  getGameStats: (state: PlayerState) => ({
    turnNumber: state.turnNumber,
    currentPlayer: state.currentPlayerId,
    phase: state.gamePhase,
    playerCount: state.players.length,
    activePlayers: state.players.filter(p => !p.isEliminated).length,
    eliminatedPlayers: state.players.filter(p => p.isEliminated).length
  }),
}
