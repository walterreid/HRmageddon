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
  StatusType,
  UNIT_STATS,
} from 'shared'

type GameStore = SharedGameState & {
  possibleMoves: Coordinate[]
  possibleTargets: Coordinate[]
  highlightedTiles: Map<string, string>

  initializeGame: () => void
  selectUnit: (unit: Unit | undefined | null) => void
  selectTile: (coord: Coordinate) => void
  moveUnit: (unitId: string, to: Coordinate) => void
  attackTarget: (attackerId: string, targetId: string) => void
  captureCubicle: (unitId: string, coord: Coordinate) => void
  endTurn: () => void

  getUnitAt: (coord: Coordinate) => Unit | undefined
  getTileAt: (coord: Coordinate) => Tile | undefined
  calculatePossibleMoves: (unit: Unit) => Coordinate[]
  calculatePossibleTargets: (unit: Unit) => Coordinate[]
  isValidMove: (unit: Unit, to: Coordinate) => boolean
  isValidAttack: (attacker: Unit, target: Unit) => boolean
  checkVictoryConditions: () => void
}

export const useGameStore = create<GameStore>((set, get) => ({
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
  possibleMoves: [],
  possibleTargets: [],
  highlightedTiles: new Map<string, string>(),

  initializeGame: () => {
    const board = createBoard()
    const players = createPlayers()
    const units = createInitialUnits()

    set({
      board,
      players,
      units,
      currentPlayerId: players[0].id,
      phase: GamePhase.PLAYING,
      turnNumber: 1,
      selectedUnit: undefined,
      possibleMoves: [],
      possibleTargets: [],
      highlightedTiles: new Map(),
      winner: undefined,
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
    if (unit.playerId !== state.currentPlayerId) return
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

      const updatedBoard = state.board.map((row) =>
        row.map((tile) => (tile.x === coord.x && tile.y === coord.y ? { ...tile, owner: unit.playerId } : tile))
      )

      const updatedUnits = state.units.map((u) =>
        u.id === unitId ? { ...u, actionsRemaining: u.actionsRemaining - 1 } : u
      )

      const cubicleCount = updatedBoard
        .flat()
        .filter((t) => t.type === TileType.CUBICLE && t.owner === unit.playerId).length

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

      return {
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
    })
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
    if (p1Units.length === 0) set({ winner: 'player2', phase: GamePhase.GAME_OVER })
    if (p2Units.length === 0) set({ winner: 'player1', phase: GamePhase.GAME_OVER })

    const VICTORY_THRESHOLD = 7
    state.players.forEach((p) => {
      if (p.controlledCubicles >= VICTORY_THRESHOLD) set({ winner: p.id, phase: GamePhase.GAME_OVER })
    })
  },
}))

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
    { id: 'blue-intern-1', playerId: 'player1', type: UnitType.INTERN, position: { x: 0, y: 1 }, ...UNIT_STATS[UnitType.INTERN], actionsRemaining: 2, status: [], hasMoved: false, hasAttacked: false },
    { id: 'blue-secretary-1', playerId: 'player1', type: UnitType.SECRETARY, position: { x: 1, y: 1 }, ...UNIT_STATS[UnitType.SECRETARY], actionsRemaining: 2, status: [], hasMoved: false, hasAttacked: false },
    { id: 'red-intern-1', playerId: 'player2', type: UnitType.INTERN, position: { x: 7, y: 8 }, ...UNIT_STATS[UnitType.INTERN], actionsRemaining: 2, status: [], hasMoved: false, hasAttacked: false },
    { id: 'red-secretary-1', playerId: 'player2', type: UnitType.SECRETARY, position: { x: 6, y: 8 }, ...UNIT_STATS[UnitType.SECRETARY], actionsRemaining: 2, status: [], hasMoved: false, hasAttacked: false },
  ]
}

function isAdjacent(a: Coordinate, b: Coordinate): boolean {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1
}

function calculateDamage(attacker: Unit, target: Unit): number {
  let damage = attacker.attackDamage
  if (target.status.some((s) => s.type === StatusType.WRITTEN_UP)) damage += 1
  return Math.max(1, damage)
}




