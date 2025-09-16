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
