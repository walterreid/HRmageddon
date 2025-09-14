export var TileType;
(function (TileType) {
    TileType["NORMAL"] = "normal";
    TileType["CUBICLE"] = "cubicle";
    TileType["OBSTACLE"] = "obstacle";
    TileType["CONFERENCE_ROOM"] = "conference";
    TileType["HALLWAY"] = "hallway";
    TileType["HQ_BLUE"] = "hq_blue";
    TileType["HQ_RED"] = "hq_red";
})(TileType || (TileType = {}));
export var HighlightType;
(function (HighlightType) {
    HighlightType["MOVEMENT"] = "movement";
    HighlightType["ATTACK"] = "attack";
    HighlightType["ABILITY"] = "ability";
    HighlightType["CAPTURE"] = "capture";
    // New enhanced highlighting types
    HighlightType["ATTACK_RANGE"] = "attack_range";
    HighlightType["ABILITY_AOE"] = "ability_aoe";
    HighlightType["TARGET_ENEMY"] = "target_enemy";
    HighlightType["TARGET_ALLY"] = "target_ally";
    HighlightType["INVALID"] = "invalid";
})(HighlightType || (HighlightType = {}));
export var UnitType;
(function (UnitType) {
    UnitType["INTERN"] = "intern";
    UnitType["SECRETARY"] = "secretary";
    UnitType["SALES_REP"] = "sales_rep";
    UnitType["HR_MANAGER"] = "hr_manager";
    UnitType["IT_SPECIALIST"] = "it_specialist";
    UnitType["ACCOUNTANT"] = "accountant";
    UnitType["LEGAL_COUNSEL"] = "legal";
    UnitType["EXECUTIVE"] = "executive";
})(UnitType || (UnitType = {}));
export var StatusType;
(function (StatusType) {
    StatusType["WRITTEN_UP"] = "written_up";
    StatusType["HARASSED"] = "harassed";
    StatusType["FILED"] = "filed";
    StatusType["ON_DEADLINE"] = "on_deadline";
    StatusType["OUT_TO_LUNCH"] = "out_to_lunch";
    StatusType["EXHAUSTED"] = "exhausted";
    StatusType["INSPIRED"] = "inspired";
    StatusType["FOCUSED"] = "focused";
    StatusType["CONFUSED"] = "confused";
    StatusType["STUNNED"] = "stunned";
    StatusType["SHIELDED"] = "shielded";
    StatusType["BURNING"] = "burning";
    StatusType["FROZEN"] = "frozen";
    StatusType["POISONED"] = "poisoned";
})(StatusType || (StatusType = {}));
export var Team;
(function (Team) {
    Team["BLUE"] = "blue";
    Team["RED"] = "red";
})(Team || (Team = {}));
export var GamePhase;
(function (GamePhase) {
    GamePhase["SETUP"] = "setup";
    GamePhase["DRAFT"] = "draft";
    GamePhase["DRAFTING"] = "drafting";
    GamePhase["PLAYING"] = "playing";
    GamePhase["PAUSED"] = "paused";
    GamePhase["GAME_OVER"] = "game_over";
    GamePhase["WAITING_FOR_PLAYERS"] = "waiting_for_players";
})(GamePhase || (GamePhase = {}));
export var ActionType;
(function (ActionType) {
    ActionType["MOVE_UNIT"] = "move_unit";
    ActionType["ATTACK_UNIT"] = "attack_unit";
    ActionType["USE_ABILITY"] = "use_ability";
    ActionType["CAPTURE_CUBICLE"] = "capture_cubicle";
    ActionType["HIRE_UNIT"] = "hire_unit";
    ActionType["END_TURN"] = "end_turn";
})(ActionType || (ActionType = {}));
// Unit Configuration
export const UNIT_STATS = {
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
};
// Unit costs for draft system (in thousands of dollars)
export const UNIT_COSTS = {
    [UnitType.INTERN]: 20,
    [UnitType.SECRETARY]: 30,
    [UnitType.SALES_REP]: 30,
    [UnitType.HR_MANAGER]: 50,
    [UnitType.IT_SPECIALIST]: 40,
    [UnitType.ACCOUNTANT]: 40,
    [UnitType.LEGAL_COUNSEL]: 50,
    [UnitType.EXECUTIVE]: 60,
};
// New ability targeting types
export var AbilityTargetingType;
(function (AbilityTargetingType) {
    AbilityTargetingType["SINGLE_TARGET"] = "single_target";
    AbilityTargetingType["AOE_CIRCLE"] = "aoe_circle";
    AbilityTargetingType["AOE_CONE"] = "aoe_cone";
    AbilityTargetingType["DIRECTIONAL"] = "directional";
    AbilityTargetingType["SELF_BUFF"] = "self_buff";
    AbilityTargetingType["ALL_ALLIES"] = "all_allies";
    AbilityTargetingType["ALL_ENEMIES"] = "all_enemies";
})(AbilityTargetingType || (AbilityTargetingType = {}));
export const TargetType = {
    SELF: 'self',
    ALLY: 'ally',
    ENEMY: 'enemy',
    TILE: 'tile',
    NONE: 'none',
    ALL_ALLIES: 'all_allies',
    ALL_ENEMIES: 'all_enemies',
    ADJACENT: 'adjacent',
};
