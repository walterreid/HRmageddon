import { create } from 'zustand'
import {
  GamePhase,
  type GameState as SharedGameState,
  type Unit,
  type Coordinate,
  type Player,
  type Tile,
  TileType,
  UnitType,
  UNIT_STATS,
  UNIT_COSTS,
  type DraftState,
} from 'shared'
import { AIController } from '../game/systems/ai'
import { generateAIDraft } from '../game/systems/aiDraft'

type GameMode = 'menu' | 'ai' | 'multiplayer'

type GameStore = SharedGameState & {
  gameMode: GameMode
  possibleMoves: Coordinate[]
  possibleTargets: Coordinate[]
  highlightedTiles: Map<string, string>
  draftState: DraftState

  setGameMode: (mode: GameMode) => void
  initializeGame: () => void
  initializeDraft: () => void
  addUnitToDraft: (unitType: UnitType) => void
  removeUnitFromDraft: (index: number) => void
  confirmDraft: () => void
  selectUnit: (unit: Unit | undefined | null) => void
  selectTile: (coord: Coordinate) => void
  moveUnit: (unitId: string, to: Coordinate) => void
  attackTarget: (attackerId: string, targetId: string) => void
  captureCubicle: (unitId: string, coord: Coordinate) => void
  endTurn: () => void
  executeAITurn: () => void
  returnToMenu: () => void

  getUnitAt: (coord: Coordinate) => Unit | undefined
  getTileAt: (coord: Coordinate) => Tile | undefined
  calculatePossibleMoves: (unit: Unit) => Coordinate[]
  calculatePossibleTargets: (unit: Unit) => Coordinate[]
  isValidMove: (unit: Unit, to: Coordinate) => boolean
  isValidAttack: (attacker: Unit, target: Unit) => boolean
  checkVictoryConditions: () => void
}

export const useGameStore = create<GameStore>((set, get) => {
  // Create AI controller instance
  const aiController = new AIController('normal')
  
  return {
  // Initial shared state
  id: 'local-game',
  board: [],
  units: [],
  players: [],
  currentPlayerId: '',
  turnNumber: 1,
  phase: GamePhase.SETUP,
  selectedUnit: undefined,
  winner: undefined,

  // Local UI state
  gameMode: 'menu',
  possibleMoves: [],
  possibleTargets: [],
  highlightedTiles: new Map<string, string>(),
  draftState: {
    playerBudget: 200,
    maxHeadcount: 6,
    selectedUnits: [],
    aiUnits: [],
  },

  setGameMode: (mode) => {
    set({ gameMode: mode })
  },

  returnToMenu: () => {
    set({
      gameMode: 'menu',
      board: [],
      units: [],
      players: [],
      currentPlayerId: '',
      turnNumber: 1,
      phase: GamePhase.SETUP,
      selectedUnit: undefined,
      winner: undefined,
      possibleMoves: [],
      possibleTargets: [],
      highlightedTiles: new Map(),
      draftState: {
        playerBudget: 200,
        maxHeadcount: 6,
        selectedUnits: [],
        aiUnits: [],
      },
    })
  },

  initializeGame: () => {
    const board = createBoard()
    const players = createPlayers()
    const units = createInitialUnits()

    // Debug: Log initial board state
    const cubicleCount = board.flat().filter(t => t.type === TileType.CUBICLE).length
    console.log('Initializing game with board:', {
      width: board[0].length,
      height: board.length,
      totalCubicles: cubicleCount,
      cubiclePositions: board.flat()
        .filter(t => t.type === TileType.CUBICLE)
        .map(t => ({ x: t.x, y: t.y }))
    })

    set({
      board,
      players,
      units,
      currentPlayerId: 'player1', // Always start with player1 (blue team)
      phase: GamePhase.PLAYING,
      turnNumber: 1,
      selectedUnit: undefined,
      possibleMoves: [],
      possibleTargets: [],
      highlightedTiles: new Map(),
      winner: undefined,
      draftState: {
        playerBudget: 200,
        maxHeadcount: 6,
        selectedUnits: [],
        aiUnits: [],
      },
    })
  },

  initializeDraft: () => {
    const aiUnits = generateAIDraft(200, 6)
    set((state) => ({
      phase: GamePhase.DRAFT,
      draftState: {
        ...state.draftState,
        aiUnits,
      }
    }))
  },

  addUnitToDraft: (unitType) => {
    const state = get()
    const cost = UNIT_COSTS[unitType]
    const currentCost = state.draftState.selectedUnits.reduce((sum, unit) => 
      sum + UNIT_COSTS[unit.type], 0
    )
    
    if (state.draftState.selectedUnits.length >= state.draftState.maxHeadcount) return
    if (currentCost + cost > state.draftState.playerBudget) return
    
    set((state) => ({
      draftState: {
        ...state.draftState,
        selectedUnits: [...state.draftState.selectedUnits, { type: unitType }]
      }
    }))
  },

  removeUnitFromDraft: (index) => {
    set((state) => ({
      draftState: {
        ...state.draftState,
        selectedUnits: state.draftState.selectedUnits.filter((_, i) => i !== index)
      }
    }))
  },

  confirmDraft: () => {
    const state = get()
    if (state.draftState.selectedUnits.length === 0) return
    
    // Define starting positions for each team
    const getPlayerStartPositions = (teamId: string): Coordinate[] => {
      if (teamId === 'player1') {
        // Blue team starts in top-left area
        return [
          { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 },
          { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 },
        ]
      } else {
        // Red team starts in bottom-right area
        const boardWidth = 8
        const boardHeight = 10
        return [
          { x: boardWidth - 1, y: boardHeight - 1 }, 
          { x: boardWidth - 2, y: boardHeight - 1 }, 
          { x: boardWidth - 3, y: boardHeight - 1 },
          { x: boardWidth - 1, y: boardHeight - 2 }, 
          { x: boardWidth - 2, y: boardHeight - 2 }, 
          { x: boardWidth - 3, y: boardHeight - 2 },
        ]
      }
    }
    
    // Create units from draft selections
    const playerPositions = getPlayerStartPositions('player1')
    const aiPositions = getPlayerStartPositions('player2')
    
    const playerUnits: Unit[] = state.draftState.selectedUnits.map((draftUnit, index) => {
      const stats = UNIT_STATS[draftUnit.type]
      return {
        id: `player1-${draftUnit.type}-${index}`,
        playerId: 'player1',
        type: draftUnit.type,
        position: playerPositions[index] || { x: 0, y: 0 },
        hp: stats.hp,
        maxHp: stats.maxHp,
        moveRange: stats.moveRange,
        attackRange: stats.attackRange,
        attackDamage: stats.attackDamage,
        actionsRemaining: stats.maxActions,
        maxActions: stats.maxActions,
        status: [],
        hasMoved: false,
        hasAttacked: false,
        cost: stats.cost,
      }
    })
    
    const aiUnits: Unit[] = state.draftState.aiUnits.map((draftUnit, index) => {
      const stats = UNIT_STATS[draftUnit.type]
      return {
        id: `player2-${draftUnit.type}-${index}`,
        playerId: 'player2',
        type: draftUnit.type,
        position: aiPositions[index] || { x: 7, y: 9 },
        hp: stats.hp,
        maxHp: stats.maxHp,
        moveRange: stats.moveRange,
        attackRange: stats.attackRange,
        attackDamage: stats.attackDamage,
        actionsRemaining: stats.maxActions, // AI units start with full actions
        maxActions: stats.maxActions,
        status: [],
        hasMoved: false,
        hasAttacked: false,
        cost: stats.cost,
      }
    })
    
    // Initialize the game with drafted units
    const board = createBoard()
    const players = createPlayers()
    
    // Debug: Log board state after draft
    const cubicleCount = board.flat().filter(t => t.type === TileType.CUBICLE).length
    console.log('Draft confirmed, board state:', {
      width: board[0].length,
      height: board.length,
      totalCubicles: cubicleCount,
      cubiclePositions: board.flat()
        .filter(t => t.type === TileType.CUBICLE)
        .map(t => ({ x: t.x, y: t.y }))
    })
    
    set({
      board,
      players,
      units: [...playerUnits, ...aiUnits],
      currentPlayerId: 'player1',
      phase: GamePhase.PLAYING,
      turnNumber: 1,
      selectedUnit: undefined,
      possibleMoves: [],
      possibleTargets: [],
      highlightedTiles: new Map(),
      winner: undefined,
      draftState: {
        playerBudget: 200,
        maxHeadcount: 6,
        selectedUnits: [],
        aiUnits: [],
      },
    })
  },

  selectUnit: (unit) => {
    if (!unit) {
      set({
        selectedUnit: undefined,
        possibleMoves: [],
        possibleTargets: [],
        highlightedTiles: new Map(),
      })
      return
    }

    const state = get()
    
    // IMPORTANT: Only allow selecting units belonging to current player
    // AND only allow player1 to select (never let human control AI units)
    if (unit.playerId !== state.currentPlayerId || state.currentPlayerId !== 'player1') {
      return
    }
    
    if (unit.actionsRemaining === 0) return

    const moves = state.calculatePossibleMoves(unit)
    const targets = state.calculatePossibleTargets(unit)

    const highlights = new Map<string, string>()
    moves.forEach((m) => highlights.set(`${m.x},${m.y}`, 'movement'))
    targets.forEach((t) => highlights.set(`${t.x},${t.y}`, 'attack'))

    set({
      selectedUnit: unit,
      possibleMoves: moves,
      possibleTargets: targets,
      highlightedTiles: highlights,
    })
  },

  selectTile: (coord) => {
    const state = get()
    const { selectedUnit, possibleMoves, possibleTargets } = state

    if (!selectedUnit) {
      const unit = state.getUnitAt(coord)
      if (unit) state.selectUnit(unit)
      return
    }

    if (possibleMoves.some((m) => m.x === coord.x && m.y === coord.y)) {
      state.moveUnit(selectedUnit.id, coord)
      state.checkVictoryConditions()
      return
    }

    const target = state.getUnitAt(coord)
    if (target && possibleTargets.some((t) => t.x === coord.x && t.y === coord.y)) {
      state.attackTarget(selectedUnit.id, target.id)
      state.checkVictoryConditions()
      return
    }

    const tile = state.getTileAt(coord)
    if (tile?.type === TileType.CUBICLE && isAdjacent(selectedUnit.position, coord)) {
      state.captureCubicle(selectedUnit.id, coord)
      state.checkVictoryConditions()
      return
    }

    state.selectUnit(undefined)
  },

  moveUnit: (unitId, to) => {
    set((state) => {
      const unit = state.units.find((u) => u.id === unitId)
      if (!unit || !state.isValidMove(unit, to)) return state

      const updatedUnits = state.units.map((u) =>
        u.id === unitId
          ? { ...u, position: to, actionsRemaining: u.actionsRemaining - 1, hasMoved: true }
          : u
      )

      return {
        ...state,
        units: updatedUnits,
        selectedUnit: undefined,
        possibleMoves: [],
        possibleTargets: [],
        highlightedTiles: new Map(),
      }
    })
  },

  attackTarget: (attackerId, targetId) => {
    set((state) => {
      const attacker = state.units.find((u) => u.id === attackerId)
      const target = state.units.find((u) => u.id === targetId)
      if (!attacker || !target || !state.isValidAttack(attacker, target)) return state

      const damage = calculateDamage(attacker, target)

      const updatedUnits = state.units
        .map((u) => {
          if (u.id === attackerId) {
            return { ...u, actionsRemaining: u.actionsRemaining - 1, hasAttacked: true }
          }
          if (u.id === targetId) {
            const newHp = Math.max(0, u.hp - damage)
            return newHp > 0 ? { ...u, hp: newHp } : null
          }
          return u
        })
        .filter(Boolean) as Unit[]

      return {
        ...state,
        units: updatedUnits,
        selectedUnit: undefined,
        possibleMoves: [],
        possibleTargets: [],
        highlightedTiles: new Map(),
      }
    })
  },

  captureCubicle: (unitId, coord) => {
    set((state) => {
      const unit = state.units.find((u) => u.id === unitId)
      if (!unit || unit.actionsRemaining === 0) return state

      const tile = state.board[coord.y]?.[coord.x]
      if (!tile || tile.type !== TileType.CUBICLE) {
        console.log('Cannot capture: not a cubicle tile')
        return state
      }

      if (tile.owner === unit.playerId) {
        console.log('Cannot capture: already owned by this player')
        return state
      }

      console.log('Capturing cubicle:', {
        unitId,
        unitPlayer: unit.playerId,
        coord,
        currentOwner: tile.owner,
        tileType: tile.type
      })

      const updatedBoard = state.board.map((row) =>
        row.map((tile) => (tile.x === coord.x && tile.y === coord.y ? { ...tile, owner: unit.playerId } : tile))
      )

      const updatedUnits = state.units.map((u) =>
        u.id === unitId ? { ...u, actionsRemaining: u.actionsRemaining - 1 } : u
      )

      const cubicleCount = updatedBoard
        .flat()
        .filter((t) => t.type === TileType.CUBICLE && t.owner === unit.playerId).length

      console.log('Updated cubicle count for player', unit.playerId, ':', cubicleCount)

      const updatedPlayers = state.players.map((p) =>
        p.id === unit.playerId ? { ...p, controlledCubicles: cubicleCount, income: cubicleCount } : p
      )

      return {
        ...state,
        board: updatedBoard,
        units: updatedUnits,
        players: updatedPlayers,
        selectedUnit: undefined,
        possibleMoves: [],
        possibleTargets: [],
        highlightedTiles: new Map(),
      }
    })
  },

  endTurn: () => {
    set((state) => {
      const currentPlayerIndex = state.players.findIndex((p) => p.id === state.currentPlayerId)
      const nextPlayerIndex = (currentPlayerIndex + 1) % state.players.length
      const nextPlayer = state.players[nextPlayerIndex]

      const updatedUnits = state.units.map((u) =>
        u.playerId === nextPlayer.id
          ? { ...u, actionsRemaining: u.maxActions, hasMoved: false, hasAttacked: false }
          : u
      )

      let updatedPlayers = state.players
      if (nextPlayerIndex === 0) {
        updatedPlayers = state.players.map((p) => ({ ...p, budget: p.budget + p.income }))
      }

      const newState = {
        ...state,
        currentPlayerId: nextPlayer.id,
        turnNumber: nextPlayerIndex === 0 ? state.turnNumber + 1 : state.turnNumber,
        units: updatedUnits,
        players: updatedPlayers,
        selectedUnit: undefined,
        possibleMoves: [],
        possibleTargets: [],
        highlightedTiles: new Map(),
      }

      // IMPORTANT: Trigger AI turn if next player is AI
      if (nextPlayer.id === 'player2') {
        setTimeout(() => {
          get().executeAITurn()
        }, 500) // Small delay for visual feedback
      }

      return newState
    })
  },

  // Add new function to execute AI turn
  executeAITurn: () => {
    const state = get()
    if (state.currentPlayerId !== 'player2') return
    
    console.log('AI Turn starting...', {
      currentPlayer: state.currentPlayerId,
      aiUnits: state.units.filter(u => u.playerId === 'player2'),
      playerUnits: state.units.filter(u => u.playerId === 'player1')
    })
    
    // Create AI controller instance
    const aiController = new AIController('normal')
    
    // Get current game state and let AI make decisions with action callbacks
    aiController.takeTurn(state, {
      moveUnit: (unitId: string, to: Coordinate) => {
        console.log('AI moving unit', unitId, 'to', to)
        get().moveUnit(unitId, to)
        // Check victory conditions after each action
        get().checkVictoryConditions()
      },
      attackTarget: (attackerId: string, targetId: string) => {
        console.log('AI attacking', attackerId, '->', targetId)
        get().attackTarget(attackerId, targetId)
        // Check victory conditions after each action
        get().checkVictoryConditions()
      },
      captureCubicle: (unitId: string, coord: Coordinate) => {
        console.log('AI capturing cubicle', unitId, 'at', coord)
        get().captureCubicle(unitId, coord)
        // Check victory conditions after each action
        get().checkVictoryConditions()
      },
      endTurn: () => {
        // Check victory conditions one final time before ending turn
        get().checkVictoryConditions()
        get().endTurn()
      },
    }, get) // Pass the get function so AI can fetch fresh state
  },

  getUnitAt: (coord) => get().units.find((u) => u.position.x === coord.x && u.position.y === coord.y),

  getTileAt: (coord) => {
    const { board } = get()
    return board[coord.y]?.[coord.x]
  },

  calculatePossibleMoves: (unit) => {
    if (unit.hasMoved || unit.actionsRemaining === 0) return []

    const { board, units } = get()
    const moves: Coordinate[] = []
    const visited = new Set<string>()
    const queue: { coord: Coordinate; distance: number }[] = [{ coord: unit.position, distance: 0 }]

    while (queue.length > 0) {
      const { coord, distance } = queue.shift()!
      const key = `${coord.x},${coord.y}`
      if (visited.has(key)) continue
      visited.add(key)

      if (distance > 0 && distance <= unit.moveRange) {
        const tile = board[coord.y]?.[coord.x]
        const occupant = units.find((u) => u.position.x === coord.x && u.position.y === coord.y)
        if (tile && tile.type !== TileType.OBSTACLE && !occupant) {
          moves.push(coord)
        }
      }

      if (distance < unit.moveRange) {
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
    return moves
  },

  calculatePossibleTargets: (unit) => {
    if (unit.hasAttacked || unit.actionsRemaining === 0) return []
    const { units } = get()
    const targets: Coordinate[] = []
    for (const enemy of units) {
      if (enemy.playerId === unit.playerId) continue
      const distance = Math.abs(enemy.position.x - unit.position.x) + Math.abs(enemy.position.y - unit.position.y)
      if (distance <= unit.attackRange) targets.push(enemy.position)
    }
    return targets
  },

  isValidMove: (unit, to) => get().calculatePossibleMoves(unit).some((m) => m.x === to.x && m.y === to.y),
  isValidAttack: (attacker, target) =>
    get()
      .calculatePossibleTargets(attacker)
      .some((t) => t.x === target.position.x && t.y === target.position.y),

  checkVictoryConditions: () => {
    const state = get()
    const p1Units = state.units.filter((u) => u.playerId === 'player1')
    const p2Units = state.units.filter((u) => u.playerId === 'player2')
    
    console.log('Checking victory conditions:', {
      p1Units: p1Units.length,
      p2Units: p2Units.length,
      p1ControlledCubicles: state.players.find(p => p.id === 'player1')?.controlledCubicles,
      p2ControlledCubicles: state.players.find(p => p.id === 'player2')?.controlledCubicles,
      totalCubicles: state.board.flat().filter(t => t.type === TileType.CUBICLE).length,
      currentPhase: state.phase,
      winner: state.winner
    })
    
    // Check if game is already over
    if (state.phase === GamePhase.GAME_OVER) {
      console.log('Game is already over, skipping victory check')
      return
    }
    
    if (p1Units.length === 0) {
      console.log('Player 1 has no units left - Player 2 wins!')
      set({ winner: 'player2', phase: GamePhase.GAME_OVER })
      return
    }
    if (p2Units.length === 0) {
      console.log('Player 2 has no units left - Player 1 wins!')
      set({ winner: 'player1', phase: GamePhase.GAME_OVER })
      return
    }

    const VICTORY_THRESHOLD = 7
    for (const p of state.players) {
      if (p.controlledCubicles >= VICTORY_THRESHOLD) {
        console.log(`Player ${p.id} has ${p.controlledCubicles} cubicles (>= ${VICTORY_THRESHOLD}) - ${p.id} wins!`)
        set({ winner: p.id, phase: GamePhase.GAME_OVER })
        return
      }
    }
  },
}})

function createBoard(): Tile[][] {
  const width = 8
  const height = 10
  const board: Tile[][] = []
  for (let y = 0; y < height; y++) {
    const row: Tile[] = []
    for (let x = 0; x < width; x++) {
      let type: TileType = TileType.NORMAL
      if (y === 0 && x <= 1) type = TileType.HQ_BLUE
      if (y === height - 1 && x >= width - 2) type = TileType.HQ_RED
      if (y >= 2 && y <= height - 3 && x >= 2 && x <= width - 3) {
        if ((x + y) % 2 === 0) type = TileType.CUBICLE
      }
      if ((x === 3 && y === 5) || (x === 4 && y === 4)) type = TileType.OBSTACLE
      row.push({ x, y, type })
    }
    board.push(row)
  }
  return board
}

function createPlayers(): Player[] {
  return [
    { id: 'player1', name: 'Blue Team', team: 'blue' as any, budget: 10, income: 0, controlledCubicles: 0 },
    { id: 'player2', name: 'Red Team', team: 'red' as any, budget: 10, income: 0, controlledCubicles: 0 },
  ]
}

function createInitialUnits(): Unit[] {
  return [
    { id: 'blue-intern-1', playerId: 'player1', position: { x: 0, y: 1 }, ...UNIT_STATS[UnitType.INTERN], actionsRemaining: 2, status: [], hasMoved: false, hasAttacked: false },
    { id: 'blue-secretary-1', playerId: 'player1', position: { x: 1, y: 1 }, ...UNIT_STATS[UnitType.SECRETARY], actionsRemaining: 2, status: [], hasMoved: false, hasAttacked: false },
    { id: 'red-intern-1', playerId: 'player2', position: { x: 7, y: 8 }, ...UNIT_STATS[UnitType.INTERN], actionsRemaining: 2, status: [], hasMoved: false, hasAttacked: false },
    { id: 'red-secretary-1', playerId: 'player2', position: { x: 6, y: 8 }, ...UNIT_STATS[UnitType.SECRETARY], actionsRemaining: 2, status: [], hasMoved: false, hasAttacked: false },
  ]
}

function isAdjacent(a: Coordinate, b: Coordinate): boolean {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1
}

function calculateDamage(attacker: Unit, target: Unit): number {
  return Math.max(1, attacker.attackDamage - Math.floor(target.hp / 10))
}




