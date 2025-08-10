export type Coordinate = {
    x: number;
    y: number;
};
export interface Tile {
    x: number;
    y: number;
    type: TileType;
    occupied?: Unit;
    owner?: PlayerId;
    highlighted?: HighlightType;
}
export declare enum TileType {
    NORMAL = "normal",
    CUBICLE = "cubicle",
    OBSTACLE = "obstacle",
    CONFERENCE_ROOM = "conference",
    HALLWAY = "hallway",
    HQ_BLUE = "hq_blue",
    HQ_RED = "hq_red"
}
export declare enum HighlightType {
    MOVEMENT = "movement",
    ATTACK = "attack",
    ABILITY = "ability",
    CAPTURE = "capture"
}
export interface Unit {
    id: string;
    playerId: PlayerId;
    type: UnitType;
    position: Coordinate;
    hp: number;
    maxHp: number;
    moveRange: number;
    attackRange: number;
    attackDamage: number;
    actionsRemaining: number;
    maxActions: number;
    status: StatusEffect[];
    cost: number;
    hasMoved: boolean;
    hasAttacked: boolean;
    abilities: string[];
    abilityCooldowns: Record<string, number>;
}
export declare enum UnitType {
    INTERN = "intern",
    SECRETARY = "secretary",
    SALES_REP = "sales_rep",
    HR_MANAGER = "hr_manager",
    IT_SPECIALIST = "it_specialist",
    ACCOUNTANT = "accountant",
    LEGAL_COUNSEL = "legal",
    EXECUTIVE = "executive"
}
export interface StatusEffect {
    type: StatusType;
    duration: number;
    source?: string;
}
export declare enum StatusType {
    WRITTEN_UP = "written_up",
    HARASSED = "harassed",
    FILED = "filed",
    ON_DEADLINE = "on_deadline",
    OUT_TO_LUNCH = "out_to_lunch",
    EXHAUSTED = "exhausted",
    INSPIRED = "inspired",
    FOCUSED = "focused",
    CONFUSED = "confused",
    STUNNED = "stunned",
    SHIELDED = "shielded",
    BURNING = "burning",
    FROZEN = "frozen",
    POISONED = "poisoned"
}
export interface GameState {
    id: string;
    board: Tile[][];
    units: Unit[];
    players: Player[];
    currentPlayerId: PlayerId;
    turnNumber: number;
    phase: GamePhase;
    selectedUnit?: Unit;
    winner?: PlayerId;
}
export interface Player {
    id: PlayerId;
    name: string;
    team: Team;
    budget: number;
    income: number;
    controlledCubicles: number;
}
export declare enum Team {
    BLUE = "blue",
    RED = "red"
}
export type PlayerId = string;
export declare enum GamePhase {
    SETUP = "setup",
    DRAFT = "draft",
    PLAYING = "playing",
    GAME_OVER = "game_over"
}
export interface DraftState {
    playerBudget: number;
    maxHeadcount: number;
    selectedUnits: DraftUnit[];
    aiUnits: DraftUnit[];
}
export interface DraftUnit {
    type: UnitType;
    position?: Coordinate;
}
export interface GameAction {
    type: ActionType;
    playerId: PlayerId;
    unitId?: string;
    target?: Coordinate;
    abilityId?: string;
}
export declare enum ActionType {
    MOVE_UNIT = "move_unit",
    ATTACK_UNIT = "attack_unit",
    USE_ABILITY = "use_ability",
    CAPTURE_CUBICLE = "capture_cubicle",
    HIRE_UNIT = "hire_unit",
    END_TURN = "end_turn"
}
export declare const UNIT_STATS: Record<UnitType, Omit<Unit, 'id' | 'playerId' | 'position' | 'status' | 'hasMoved' | 'hasAttacked' | 'actionsRemaining'>>;
export declare const UNIT_COSTS: Record<UnitType, number>;
export interface Ability {
    id: string;
    name: string;
    description: string;
    cost: number;
    cooldown: number;
    range: number;
    targetType: TargetType;
    effect: (caster: Unit, target?: Unit | Coordinate) => AbilityResult;
    visualEffect?: string;
    soundEffect?: string;
}
export declare const TargetType: {
    readonly SELF: "self";
    readonly ALLY: "ally";
    readonly ENEMY: "enemy";
    readonly TILE: "tile";
    readonly NONE: "none";
    readonly ALL_ALLIES: "all_allies";
    readonly ALL_ENEMIES: "all_enemies";
    readonly ADJACENT: "adjacent";
};
export type TargetType = typeof TargetType[keyof typeof TargetType];
export interface AbilityResult {
    success: boolean;
    message?: string;
    statusApplied?: StatusEffect[];
    damageDealt?: number;
    healingDone?: number;
    movementBonus?: number;
    actionBonus?: number;
    targetPosition?: Coordinate;
}
//# sourceMappingURL=index.d.ts.map