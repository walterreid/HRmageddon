import { type Unit, type GameState, type Player, type Tile, UnitType, StatusType, TileType } from 'shared'

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
    hasMoved: false,
    hasAttacked: false,
    abilities: ['fetch_coffee', 'overtime'],
    abilityCooldowns: {},
    statusEffects: [],
    ...overrides
  }
}

export function createMockPlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'player1',
    name: 'Test Player',
    color: '#ff0000',
    score: 0,
    ...overrides
  }
}

export function createMockTile(overrides: Partial<Tile> = {}): Tile {
  return {
    type: TileType.CUBICLE,
    owner: null,
    occupied: null,
    ...overrides
  }
}

export function createMockGameState(overrides: Partial<GameState> = {}): GameState {
  return {
    board: [
      [createMockTile(), createMockTile(), createMockTile()],
      [createMockTile(), createMockTile(), createMockTile()],
      [createMockTile(), createMockTile(), createMockTile()]
    ],
    units: [createMockUnit()],
    players: [createMockPlayer()],
    currentPlayerId: 'player1',
    turnNumber: 1,
    gamePhase: 'playing',
    winner: null,
    ...overrides
  }
}

export function createMockUnitWithStatus(statusType: StatusType, duration: number = 2): Unit {
  return createMockUnit({
    statusEffects: [{ type: statusType, duration, source: 'test' }]
  })
}

export function createMockUnitWithAbilities(abilities: string[]): Unit {
  return createMockUnit({
    abilities,
    abilityCooldowns: {}
  })
}
