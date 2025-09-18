import { type Unit, type GameState, type Player, type Tile, UnitType, StatusType, TileType, Team, GamePhase } from 'shared'

export function createMockUnit(overrides: Partial<Unit> = {}): Unit {
  return {
    id: 'test-unit-1',
    type: UnitType.INTERN,
    playerId: 'player1',
    position: { x: 0, y: 0 },
    hp: 10,
    maxHp: 10,
    moveRange: 2,
    attackRange: 1,
    attackDamage: 3,
    actionsRemaining: 2,
    maxActions: 2,
    hasMoved: false,
    hasAttacked: false,
    abilities: ['fetch_coffee', 'overtime'],
    abilityCooldowns: {},
    status: [],
    cost: 100,
    movementUsed: 0,
    remainingMovement: 2,
    direction: 'down',
    ...overrides
  }
}

export function createMockPlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'player1',
    name: 'Test Player',
    team: Team.BLUE,
    budget: 1000,
    income: 100,
    controlledCubicles: 0,
    ...overrides
  }
}

export function createMockTile(overrides: Partial<Tile> = {}): Tile {
  return {
    x: 0,
    y: 0,
    type: TileType.CUBICLE,
    ...overrides
  }
}

export function createMockGameState(overrides: Partial<GameState> = {}): GameState {
  return {
    id: 'test-game',
    board: [
      [createMockTile({ x: 0, y: 0 }), createMockTile({ x: 1, y: 0 }), createMockTile({ x: 2, y: 0 })],
      [createMockTile({ x: 0, y: 1 }), createMockTile({ x: 1, y: 1 }), createMockTile({ x: 2, y: 1 })],
      [createMockTile({ x: 0, y: 2 }), createMockTile({ x: 1, y: 2 }), createMockTile({ x: 2, y: 2 })]
    ],
    units: [createMockUnit()],
    players: [createMockPlayer()],
    currentPlayerId: 'player1',
    turnNumber: 1,
    phase: GamePhase.PLAYING,
    ...overrides
  }
}

export function createMockUnitWithStatus(statusType: StatusType, duration: number = 2): Unit {
  return createMockUnit({
    status: [{ type: statusType, duration, source: 'test' }]
  })
}

export function createMockUnitWithAbilities(abilities: string[]): Unit {
  return createMockUnit({
    abilities,
    abilityCooldowns: {}
  })
}
