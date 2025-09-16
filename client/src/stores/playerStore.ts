import { create } from 'zustand'
import { type Player, GamePhase, Team } from 'shared'

interface PlayerStore {
  // State - Single Source of Truth for Players and Game Flow
  players: Player[]
  currentPlayerId: string
  turnNumber: number
  phase: GamePhase
  winner: Player | undefined

  // Actions
  setPlayers: (players: Player[]) => void
  initializePlayers: () => void
  nextTurn: () => void
  setWinner: (winner: Player) => void
  setCurrentPlayerId: (playerId: string) => void
  setPhase: (phase: GamePhase) => void
  setTurnNumber: (turnNumber: number) => void
  
  // Queries
  getCurrentPlayer: () => Player | undefined
  getPlayerById: (playerId: string) => Player | undefined
  getNextPlayer: () => Player | undefined
  isGameOver: () => boolean
}

// Helper function to create players
function createPlayers(): Player[] {
  return [
    { id: 'player1', name: 'Blue Team', team: Team.BLUE, budget: 10, income: 0, controlledCubicles: 0 },
    { id: 'player2', name: 'Red Team', team: Team.RED, budget: 10, income: 0, controlledCubicles: 0 },
  ]
}

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  // Initial state
  players: [],
  currentPlayerId: '',
  turnNumber: 1,
  phase: GamePhase.SETUP,
  winner: undefined,

  // Actions
  setPlayers: (players) => {
    set({ players })
  },

  initializePlayers: () => {
    const players = createPlayers()
    set({ 
      players,
      currentPlayerId: 'player1', // Always start with player1
      turnNumber: 1,
      phase: GamePhase.PLAYING,
      winner: undefined
    })
  },

  nextTurn: () => {
    set((state) => {
      const currentPlayerIndex = state.players.findIndex((p) => p.id === state.currentPlayerId)
      const nextPlayerIndex = (currentPlayerIndex + 1) % state.players.length
      const nextPlayer = state.players[nextPlayerIndex]
      
      // Increment turn number only when we complete a full round (back to first player)
      const newTurnNumber = nextPlayerIndex === 0 ? state.turnNumber + 1 : state.turnNumber
      
      return {
        currentPlayerId: nextPlayer.id,
        turnNumber: newTurnNumber
      }
    })
  },

  setWinner: (winner) => {
    set({ 
      winner,
      phase: GamePhase.GAME_OVER
    })
  },

  setCurrentPlayerId: (playerId) => {
    set({ currentPlayerId: playerId })
  },

  setPhase: (phase) => {
    set({ phase })
  },

  setTurnNumber: (turnNumber) => {
    set({ turnNumber })
  },

  // Queries
  getCurrentPlayer: () => {
    const { players, currentPlayerId } = get()
    return players.find((p) => p.id === currentPlayerId)
  },

  getPlayerById: (playerId) => {
    return get().players.find((p) => p.id === playerId)
  },

  getNextPlayer: () => {
    const { players, currentPlayerId } = get()
    const currentPlayerIndex = players.findIndex((p) => p.id === currentPlayerId)
    const nextPlayerIndex = (currentPlayerIndex + 1) % players.length
    return players[nextPlayerIndex]
  },

  isGameOver: () => {
    return get().phase === GamePhase.GAME_OVER
  }
}))
