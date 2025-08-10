import { useGameStore } from '../stores/gameStore'
import { getUnitAbilities, canUseAbility } from '../game/systems/abilities'
import { type Unit } from 'shared'

interface ActionMenuProps {
  unit: Unit
  position: { x: number; y: number }
  onActionSelect: (action: 'move' | 'attack' | string) => void
}

export function ActionMenu({ unit, position, onActionSelect }: ActionMenuProps) {
  const { selectUnit } = useGameStore()
  const abilities = getUnitAbilities(unit.type)

  const handleActionClick = (action: 'move' | 'attack' | string) => {
    console.log('ActionMenu: handleActionClick called with action:', action)
    onActionSelect(action)
    console.log('ActionMenu: onActionSelect called')
    // Don't close the menu here - let the parent component handle it
    // The action mode should be set first, then the menu can close
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      // Only close the menu if we're not in an action mode
      const gameScene = (window as any).gameScene
      if (gameScene && gameScene.getActionMode && gameScene.getActionMode() === 'none') {
        // Deselect the unit to close the menu
        selectUnit(undefined)
      }
    }
  }

  const handleClose = () => {
    // Deselect the unit to close the menu
    selectUnit(undefined)
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-slate-800 border-2 border-slate-600 rounded-lg shadow-2xl p-6 min-w-[300px] max-w-[400px] text-slate-100"
        style={{
          position: 'absolute',
          left: Math.max(10, Math.min(position.x, window.innerWidth - 350)),
          top: Math.max(10, Math.min(position.y, window.innerHeight - 400)),
          zIndex: 1000,
        }}
      >
        {/* Header */}
        <div className="text-center mb-6">
          <h3 className="text-xl font-bold text-blue-400 capitalize">
            {unit.type.replace('_', ' ')} Actions
          </h3>
          <div className="text-sm text-slate-300">
            {unit.actionsRemaining} action{unit.actionsRemaining !== 1 ? 's' : ''} remaining
          </div>
        </div>

        {/* Actions List */}
        <div className="space-y-3">
          {/* Move Action */}
          <button
            onClick={() => handleActionClick('move')}
            className="w-full text-left p-4 bg-blue-600 hover:bg-blue-700 border border-blue-500 rounded-lg transition-colors duration-200"
          >
            <div className="font-semibold text-white">Move Employee</div>
            <div className="text-sm text-blue-100">Move this unit to a new location</div>
          </button>

          {/* Attack Action */}
          <button
            onClick={() => handleActionClick('attack')}
            className="w-full text-left p-4 bg-red-600 hover:bg-red-700 border border-red-500 rounded-lg transition-colors duration-200"
          >
            <div className="font-semibold text-white">Attack</div>
            <div className="text-sm text-red-100">Attack enemy units in range</div>
          </button>

          {/* Abilities */}
          {abilities.map((ability) => {
            const canUse = canUseAbility(unit, ability.id)
            return (
              <button
                key={ability.id}
                onClick={() => handleActionClick(ability.id)}
                disabled={!canUse}
                className={`w-full text-left p-4 border rounded-lg transition-colors duration-200 ${
                  canUse 
                    ? 'bg-amber-600 hover:bg-amber-700 border-amber-500 text-white' 
                    : 'bg-slate-700 border-slate-500 text-slate-400 cursor-not-allowed'
                }`}
              >
                <div className="font-semibold">{ability.name}</div>
                <div className="text-sm opacity-80">
                  Cost: {ability.cost} AP • Range: {ability.range}
                </div>
                {ability.cooldown > 0 && (
                  <div className="text-xs opacity-70">
                    Cooldown: {ability.cooldown} turns
                  </div>
                )}
                {!canUse && (
                  <div className="text-xs text-red-400 mt-1">
                    {unit.actionsRemaining < ability.cost ? 'Not enough AP' : 'Out of range or on cooldown'}
                  </div>
                )}
              </button>
            )
          })}

          {/* End Actions */}
          <button
            onClick={handleClose}
            className="w-full text-center p-3 bg-slate-600 hover:bg-slate-700 border border-slate-500 rounded-lg transition-colors duration-200"
          >
            <div className="font-semibold text-slate-200">Close</div>
          </button>
        </div>
      </div>
    </div>
  )
}
