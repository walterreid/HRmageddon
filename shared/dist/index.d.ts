export type Coordinate = {
    x: number;
    y: number;
};
export type DirectionalTarget = {
    direction: Coordinate;
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
    CAPTURE = "capture",
    ATTACK_RANGE = "attack_range",
    ABILITY_AOE = "ability_aoe",
    TARGET_ENEMY = "target_enemy",
    TARGET_ALLY = "target_ally",
    INVALID = "invalid"
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
    status: LegacyStatusEffect[];
    cost: number;
    hasMoved: boolean;
    hasAttacked: boolean;
    abilities: string[];
    abilityCooldowns: Record<string, number>;
    movementUsed: number;
    remainingMovement: number;
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
export interface LegacyStatusEffect {
    type: StatusType;
    duration: number;
    source?: string;
}
export interface StatusEffect {
    key: string;
    name: string;
    description: string;
    type: 'buff' | 'debuff';
    duration_in_turns: number;
    modifiers?: {
        stat: string;
        operation: 'multiply' | 'add' | 'set';
        value: number | boolean;
    };
    tick_effect?: {
        type: string;
        value: number;
    };
    visual_effect: string;
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
    DRAFTING = "drafting",
    PLAYING = "playing",
    PAUSED = "paused",
    GAME_OVER = "game_over",
    WAITING_FOR_PLAYERS = "waiting_for_players"
}
export interface DraftState {
    playerBudget: number;
    maxHeadcount: number;
    selectedUnits: DraftUnit[];
    aiUnits: DraftUnit[];
}
export interface DraftUnit {
    employeeKey: string;
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
export interface Ability {
    id: string;
    name: string;
    description: string;
    cost: number;
    cooldown: number;
    range: number;
    targetType: TargetType;
    targetingType: AbilityTargetingType;
    aoeRadius?: number;
    coneAngle?: number;
    requiresDirection?: boolean;
    effect: (caster: Unit, target?: Unit | Coordinate) => AbilityResult;
    visualEffect?: string;
    soundEffect?: string;
}
export declare enum AbilityTargetingType {
    SINGLE_TARGET = "single_target",
    AOE_CIRCLE = "aoe_circle",
    AOE_CONE = "aoe_cone",
    DIRECTIONAL = "directional",
    SELF_BUFF = "self_buff",
    ALL_ALLIES = "all_allies",
    ALL_ENEMIES = "all_enemies"
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
    statusApplied?: LegacyStatusEffect[];
    damageDealt?: number;
    healingDone?: number;
    movementBonus?: number;
    actionBonus?: number;
    targetPosition?: Coordinate;
}
export interface Employee {
    id: number;
    key: string;
    name: string;
    cost: number;
    stats: {
        health: number;
        attack_power: number;
        defense: number;
        speed: number;
    };
    attack: {
        type: 'melee' | 'ranged';
        range: number;
        description: string;
        status_effect: {
            type: string;
            chance: number;
            duration: number;
            magnitude?: number;
            damage_per_turn?: number;
        };
    };
    special_ability?: {
        key?: string;
        name: string;
        type: string;
        target: string;
        effect: string;
        magnitude: number;
        duration: number;
    };
}
export interface DataAbility {
    key: string;
    name: string;
    description: string;
    cooldown_turns: number;
    range_pattern_key: string;
    effects: Array<{
        type: string;
        target: string;
        value?: number;
        damage_type?: string;
        status_key?: string;
        chance?: number;
        hazard_details?: {
            name: string;
            duration_in_turns: number;
            visual_effect: string;
            on_turn_end?: {
                type: string;
                value: number;
                damage_type: string;
            };
            on_enter?: {
                type: string;
                status_key: string;
                chance: number;
            };
        };
    }>;
}
export interface AttackPattern {
    key: string;
    type: 'directional' | 'centered';
    pattern: number[][];
}
export interface GameConfig {
    game_version: string;
    draft_config: {
        starting_funds: number;
        timer_seconds: number;
        picks_per_player: number;
    };
    gameplay_rules: {
        max_team_size: number;
        turn_limit: number;
    };
}
//# sourceMappingURL=index.d.ts.map