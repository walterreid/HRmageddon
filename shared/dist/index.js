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
})(StatusType || (StatusType = {}));
export var Team;
(function (Team) {
    Team["BLUE"] = "blue";
    Team["RED"] = "red";
})(Team || (Team = {}));
export var GamePhase;
(function (GamePhase) {
    GamePhase["SETUP"] = "setup";
    GamePhase["PLAYING"] = "playing";
    GamePhase["GAME_OVER"] = "game_over";
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
    },
};
