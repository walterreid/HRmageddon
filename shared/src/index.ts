export type Coordinate = { x: number; y: number }

// Tile System
export interface Tile {
  x: number
  y: number
  type: TileType
  occupied?: Unit
  owner?: PlayerId
  highlighted?: HighlightType
}

export enum TileType {
  NORMAL = 'normal',
  CUBICLE = 'cubicle',
  OBSTACLE = 'obstacle',
  CONFERENCE_ROOM = 'conference',
  HALLWAY = 'hallway',
  HQ_BLUE = 'hq_blue',
  HQ_RED = 'hq_red',
}

export enum HighlightType {
  MOVEMENT = 'movement',
  ATTACK = 'attack',
  ABILITY = 'ability',
  CAPTURE = 'capture',
  // New enhanced highlighting types
  ATTACK_RANGE = 'attack_range',
  ABILITY_AOE = 'ability_aoe',
  TARGET_ENEMY = 'target_enemy',
  TARGET_ALLY = 'target_ally',
  INVALID = 'invalid',
}

// Enhanced Unit System
export interface Unit {
  id: string
  playerId: PlayerId
  type: UnitType
  position: Coordinate
  hp: number
  maxHp: number
  moveRange: number
  attackRange: number
  attackDamage: number
  actionsRemaining: number
  maxActions: number
  status: StatusEffect[]
  cost: number
  hasMoved: boolean
  hasAttacked: boolean
  abilities: string[]
  abilityCooldowns: Record<string, number>
  // New movement tracking properties
  movementUsed: number // How much movement has been used this turn
  remainingMovement: number // How much movement is left this turn
}

export enum UnitType {
  INTERN = 'intern',
  SECRETARY = 'secretary',
  SALES_REP = 'sales_rep',
  HR_MANAGER = 'hr_manager',
  IT_SPECIALIST = 'it_specialist',
  ACCOUNTANT = 'accountant',
  LEGAL_COUNSEL = 'legal',
  EXECUTIVE = 'executive',
}

export interface StatusEffect {
  type: StatusType
  duration: number
  source?: string
}

export enum StatusType {
  WRITTEN_UP = 'written_up',
  HARASSED = 'harassed',
  FILED = 'filed',
  ON_DEADLINE = 'on_deadline',
  OUT_TO_LUNCH = 'out_to_lunch',
  EXHAUSTED = 'exhausted',
  INSPIRED = 'inspired',
  FOCUSED = 'focused',
  CONFUSED = 'confused',
  STUNNED = 'stunned',
  SHIELDED = 'shielded',
  BURNING = 'burning',
  FROZEN = 'frozen',
  POISONED = 'poisoned',
}

// Game State
export interface GameState {
  id: string
  board: Tile[][]
  units: Unit[]
  players: Player[]
  currentPlayerId: PlayerId
  turnNumber: number
  phase: GamePhase
  selectedUnit?: Unit
  winner?: PlayerId
}

export interface Player {
  id: PlayerId
  name: string
  team: Team
  budget: number
  income: number
  controlledCubicles: number
}

export enum Team {
  BLUE = 'blue',
  RED = 'red',
}

export type PlayerId = string

export enum GamePhase {
  SETUP = 'setup',
  DRAFT = 'draft',
  DRAFTING = 'drafting',
  PLAYING = 'playing',
  PAUSED = 'paused',
  GAME_OVER = 'game_over',
  WAITING_FOR_PLAYERS = 'waiting_for_players',
}

// Add draft-related interfaces
export interface DraftState {
  playerBudget: number;
  maxHeadcount: number;
  selectedUnits: DraftUnit[];
  aiUnits: DraftUnit[];
}

export interface DraftUnit {
  type: UnitType;
  position?: Coordinate; // Will be set during deployment
}

// Actions
export interface GameAction {
  type: ActionType
  playerId: PlayerId
  unitId?: string
  target?: Coordinate
  abilityId?: string
}

export enum ActionType {
  MOVE_UNIT = 'move_unit',
  ATTACK_UNIT = 'attack_unit',
  USE_ABILITY = 'use_ability',
  CAPTURE_CUBICLE = 'capture_cubicle',
  HIRE_UNIT = 'hire_unit',
  END_TURN = 'end_turn',
}

// Unit Configuration
export const UNIT_STATS: Record<
  UnitType,
  Omit<
    Unit,
    'id' | 'playerId' | 'position' | 'status' | 'hasMoved' | 'hasAttacked' | 'actionsRemaining'
  >
> = {
  [UnitType.INTERN]: {
    type: UnitType.INTERN,
    hp: 2,
    maxHp: 2,
    moveRange: 3,
    attackRange: 1,
    attackDamage: 1,
    maxActions: 2,
    cost: 2,
    abilities: ['fetch_coffee', 'overtime'],
    abilityCooldowns: {},
    movementUsed: 0,
    remainingMovement: 3,
  },
  [UnitType.SECRETARY]: {
    type: UnitType.SECRETARY,
    hp: 2,
    maxHp: 2,
    moveRange: 3,
    attackRange: 3,
    attackDamage: 1,
    maxActions: 2,
    cost: 3,
    abilities: ['file_it'],
    abilityCooldowns: {},
    movementUsed: 0,
    remainingMovement: 3,
  },
  [UnitType.SALES_REP]: {
    type: UnitType.SALES_REP,
    hp: 3,
    maxHp: 3,
    moveRange: 4,
    attackRange: 2,
    attackDamage: 2,
    maxActions: 2,
    cost: 3,
    abilities: ['harass'],
    abilityCooldowns: {},
    movementUsed: 0,
    remainingMovement: 4,
  },
  [UnitType.HR_MANAGER]: {
    type: UnitType.HR_MANAGER,
    hp: 3,
    maxHp: 3,
    moveRange: 3,
    attackRange: 1,
    attackDamage: 2,
    maxActions: 2,
    cost: 5,
    abilities: ['pink_slip', 'mediation'],
    abilityCooldowns: {},
    movementUsed: 0,
    remainingMovement: 3,
  },
  [UnitType.IT_SPECIALIST]: {
    type: UnitType.IT_SPECIALIST,
    hp: 3,
    maxHp: 3,
    moveRange: 3,
    attackRange: 2,
    attackDamage: 2,
    maxActions: 2,
    cost: 4,
    abilities: ['hack_system', 'tech_support'],
    abilityCooldowns: {},
    movementUsed: 0,
    remainingMovement: 3,
  },
  [UnitType.ACCOUNTANT]: {
    type: UnitType.ACCOUNTANT,
    hp: 3,
    maxHp: 3,
    moveRange: 3,
    attackRange: 2,
    attackDamage: 2,
    maxActions: 2,
    cost: 4,
    abilities: ['audit', 'creative_accounting'],
    abilityCooldowns: {},
    movementUsed: 0,
    remainingMovement: 3,
  },
  [UnitType.LEGAL_COUNSEL]: {
    type: UnitType.LEGAL_COUNSEL,
    hp: 3,
    maxHp: 3,
    moveRange: 3,
    attackRange: 2,
    attackDamage: 2,
    maxActions: 2,
    cost: 5,
    abilities: ['legal_threat', 'contract_negotiation'],
    abilityCooldowns: {},
    movementUsed: 0,
    remainingMovement: 3,
  },
  [UnitType.EXECUTIVE]: {
    type: UnitType.EXECUTIVE,
    hp: 4,
    maxHp: 4,
    moveRange: 3,
    attackRange: 2,
    attackDamage: 3,
    maxActions: 2,
    cost: 6,
    abilities: ['executive_order', 'corporate_restructuring'],
    abilityCooldowns: {},
    movementUsed: 0,
    remainingMovement: 3,
  },
}

// Unit costs for draft system (in thousands of dollars)
export const UNIT_COSTS: Record<UnitType, number> = {
  [UnitType.INTERN]: 20,
  [UnitType.SECRETARY]: 30,
  [UnitType.SALES_REP]: 30,
  [UnitType.HR_MANAGER]: 50,
  [UnitType.IT_SPECIALIST]: 40,
  [UnitType.ACCOUNTANT]: 40,
  [UnitType.LEGAL_COUNSEL]: 50,
  [UnitType.EXECUTIVE]: 60,
}

// Enhanced Ability System Interfaces
export interface Ability {
  id: string
  name: string
  description: string
  cost: number
  cooldown: number
  range: number
  targetType: TargetType
  // New enhanced targeting properties
  targetingType: AbilityTargetingType
  aoeRadius?: number
  coneAngle?: number // for cone abilities in degrees
  requiresDirection?: boolean
  effect: (caster: Unit, target?: Unit | Coordinate) => AbilityResult
  visualEffect?: string
  soundEffect?: string
}

// New ability targeting types
export enum AbilityTargetingType {
  SINGLE_TARGET = 'single_target',
  AOE_CIRCLE = 'aoe_circle', 
  AOE_CONE = 'aoe_cone',
  DIRECTIONAL = 'directional',
  SELF_BUFF = 'self_buff',
  ALL_ALLIES = 'all_allies',
  ALL_ENEMIES = 'all_enemies',
}

export const TargetType = {
  SELF: 'self',
  ALLY: 'ally',
  ENEMY: 'enemy',
  TILE: 'tile',
  NONE: 'none',
  ALL_ALLIES: 'all_allies',
  ALL_ENEMIES: 'all_enemies',
  ADJACENT: 'adjacent',
} as const

export type TargetType = typeof TargetType[keyof typeof TargetType]

export interface AbilityResult {
  success: boolean
  message?: string
  statusApplied?: StatusEffect[]
  damageDealt?: number
  healingDone?: number
  movementBonus?: number
  actionBonus?: number
  targetPosition?: Coordinate
}


