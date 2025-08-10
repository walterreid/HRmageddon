
import { useGameStore } from '../stores/gameStore'
import { getUnitAbilities, canUseAbility, getValidTargets } from '../game/systems/abilities'
import { type Unit, type Coordinate } from 'shared'

interface AbilityPanelProps {
  selectedUnit: Unit
  onAbilitySelect: (abilityId: string) => void
  onTargetSelect?: (target: Unit | Coordinate) => void
  selectedAbility?: string
}

export function AbilityPanel({ 
  selectedUnit, 
  onAbilitySelect, 
  onTargetSelect, 
  selectedAbility 
}: AbilityPanelProps) {
  const { board } = useGameStore()
  const abilities = getUnitAbilities(selectedUnit.type)

  if (abilities.length === 0) {
    return (
      <div className="bg-slate-700 rounded-lg p-4">
        <h3 className="text-md font-semibold text-center text-slate-300 mb-2">
          Abilities
        </h3>
        <p className="text-xs text-slate-400 text-center">
          This unit has no special abilities
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="text-md font-semibold text-center text-slate-300">
        Abilities
      </h3>
      
      <div className="space-y-2">
        {abilities.map((ability) => {
          const canUse = canUseAbility(selectedUnit, ability.id)
          const isSelected = selectedAbility === ability.id
          const validTargets = canUse ? getValidTargets(selectedUnit, ability, board) : []
          
          return (
            <div key={ability.id} className="space-y-2">
              <button
                onClick={() => onAbilitySelect(ability.id)}
                disabled={!canUse}
                className={`w-full p-3 rounded-lg text-left transition-all duration-200 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-lg'
                    : canUse
                    ? 'bg-slate-600 hover:bg-slate-500 text-slate-200'
                    : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-semibold text-sm">{ability.name}</span>
                  <div className="flex items-center space-x-2">
                    {ability.cost > 0 && (
                      <span className="text-xs bg-slate-500 px-2 py-1 rounded">
                        {ability.cost} AP
                      </span>
                    )}
                    {ability.cooldown > 0 && (
                      <span className="text-xs bg-orange-500 px-2 py-1 rounded">
                        CD: {ability.cooldown}
                      </span>
                    )}
                    {ability.cooldown === -1 && (
                      <span className="text-xs bg-red-500 px-2 py-1 rounded">
                        One-time
                      </span>
                    )}
                  </div>
                </div>
                
                <p className="text-xs opacity-80 mb-2">{ability.description}</p>
                
                <div className="flex items-center justify-between text-xs">
                  <span>Range: {ability.range}</span>
                  <span className="capitalize">
                    {ability.targetType.replace('_', ' ')}
                  </span>
                </div>
              </button>

              {/* Show valid targets when ability is selected */}
              {isSelected && validTargets.length > 0 && onTargetSelect && (
                <div className="ml-4 space-y-1">
                  <p className="text-xs text-slate-400">Select target:</p>
                  <div className="grid grid-cols-2 gap-1">
                    {validTargets.map((target, index) => {
                      const isUnit = 'id' in target
                      const targetName = isUnit 
                        ? `${target.type.replace('_', ' ')} (${target.hp}/${target.maxHp} HP)`
                        : `Tile (${target.x}, ${target.y})`
                      
                      return (
                        <button
                          key={index}
                          onClick={() => onTargetSelect(target)}
                          className="text-xs p-2 bg-slate-600 hover:bg-slate-500 rounded text-slate-200"
                        >
                          {targetName}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Show cooldown info */}
              {!canUse && selectedUnit.abilityCooldowns[ability.id] > 0 && (
                <div className="ml-4 text-xs text-slate-400">
                  Cooldown: {selectedUnit.abilityCooldowns[ability.id]} turns remaining
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Ability info */}
      {selectedAbility && (
        <div className="mt-4 p-3 bg-slate-600 rounded-lg">
          <h4 className="font-semibold text-sm text-slate-200 mb-2">
            Ability Info
          </h4>
          <div className="text-xs text-slate-300 space-y-1">
            <p>• Click an ability to select it</p>
            <p>• Select a valid target to use the ability</p>
            <p>• Abilities cost Action Points (AP)</p>
            <p>• Some abilities have cooldowns</p>
          </div>
        </div>
      )}
    </div>
  )
}
