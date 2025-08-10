import { useGameStore } from '../stores/gameStore'
import { getUnitAbilities, canUseAbility } from '../game/systems/abilities.ts'
import { type Unit } from 'shared'

interface ActionMenuProps {
  unit: Unit
  position: { x: number; y: number }
  onActionSelect: (action: 'move' | 'attack' | string) => void
  onClose: () => void
}

export function ActionMenu({ unit, position, onActionSelect, onClose }: ActionMenuProps) {
  const { canUnitMove, canUnitAttack, getEnemiesInRange } = useGameStore()
  const abilities = getUnitAbilities(unit.type)

  // Smart action availability logic
  const canMove = canUnitMove(unit)
  const enemiesInRange = getEnemiesInRange(unit)
  const canAttack = canUnitAttack(unit) && enemiesInRange.length > 0

  const handleActionClick = (action: 'move' | 'attack' | string) => {
    console.log('ActionMenu: handleActionClick called with action:', action)
    
    // Add visual feedback
    const button = document.querySelector(`[data-action="${action}"]`) as HTMLElement
    if (button) {
      button.style.transform = 'scale(0.95)'
      setTimeout(() => {
        button.style.transform = 'scale(1)'
      }, 150)
    }
    
    // Call the action handler first
    onActionSelect(action)
    
    // DO NOT deselect the unit - just let the action mode handle it
    // The GameHUD will hide the action menu when actionMode !== 'none'
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      // Let the user click elsewhere to deselect - don't force deselect here
    }
  }

  const handleClose = () => {
    onClose()
  }

  const getActionDescription = (action: 'move' | 'attack' | string) => {
    switch (action) {
      case 'move':
        return canMove 
          ? `Move this unit to a new location (${unit.remainingMovement || unit.moveRange} tiles remaining)`
          : unit.hasMoved 
            ? 'Already moved this turn'
            : 'No actions remaining'
      case 'attack':
        return canAttack 
          ? `Attack enemy units in range (${enemiesInRange.length} target${enemiesInRange.length !== 1 ? 's' : ''} available)`
          : unit.hasAttacked 
            ? 'Already attacked this turn'
            : enemiesInRange.length === 0 
              ? 'No enemies in attack range'
              : 'No actions remaining'
      default:
        const ability = abilities.find(a => a.id === action)
        if (!ability) return 'Unknown ability'
        
        const canUse = canUseAbility(unit, action)
        if (canUse) {
          return `Cost: ${ability.cost} AP • Range: ${ability.range}${ability.description ? ` • ${ability.description}` : ''}`
        } else {
          if (unit.actionsRemaining < ability.cost) {
            return 'Not enough AP to use this ability'
          } else if (ability.cooldown > 0 && (unit.abilityCooldowns?.[action] || 0) > 0) {
            return `Ability on cooldown (${unit.abilityCooldowns?.[action] || 0} turns remaining)`
          } else {
            return 'Out of range or cannot target'
          }
        }
    }
  }

  const getActionStatus = (action: 'move' | 'attack' | string) => {
    switch (action) {
      case 'move':
        return canMove ? 'available' : 'unavailable'
      case 'attack':
        return canAttack ? 'available' : 'unavailable'
      default:
        return canUseAbility(unit, action) ? 'available' : 'unavailable'
    }
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
          <h3 className="text-xl font-bold text-yellow-400 capitalize">
            {unit.type.replace('_', ' ')} Actions
          </h3>
          <div className="text-sm text-slate-300">
            {unit.actionsRemaining} action{unit.actionsRemaining !== 1 ? 's' : ''} remaining
          </div>
          {unit.hasMoved && (
            <div className="text-xs text-amber-400 mt-1">
              Movement used: {unit.movementUsed || 0}/{unit.moveRange}
            </div>
          )}
          
          {/* Action Mode Warning */}
          <div className="text-xs text-amber-400 mt-2 font-semibold">
            🎯 Action mode active - complete your action before selecting other units
          </div>
        </div>

        {/* Actions List */}
        <div className="space-y-3">
          {/* Move Action */}
          <button
            data-action="move"
            onClick={() => handleActionClick('move')}
            disabled={!canMove}
            className={`w-full text-left p-4 border rounded-lg transition-all duration-200 ${
              canMove 
                ? 'bg-blue-600 hover:bg-blue-700 border-blue-500 text-white hover:shadow-lg' 
                : 'bg-slate-700 border-slate-500 text-slate-400 cursor-not-allowed opacity-50'
            }`}
          >
            <div className="font-semibold flex items-center justify-between">
              <span>Move Employee</span>
              <span className={`text-xs px-2 py-1 rounded ${
                getActionStatus('move') === 'available' ? 'bg-green-600' : 'bg-red-600'
              }`}>
                {getActionStatus('move') === 'available' ? 'READY' : 'UNAVAILABLE'}
              </span>
            </div>
            <div className="text-sm opacity-80 mt-1">
              {getActionDescription('move')}
            </div>
          </button>

          {/* Attack Action */}
          <button
            data-action="attack"
            onClick={() => handleActionClick('attack')}
            disabled={!canAttack}
            className={`w-full text-left p-4 border rounded-lg transition-all duration-200 ${
              canAttack 
                ? 'bg-red-600 hover:bg-red-700 border-red-500 text-white hover:shadow-lg' 
                : 'bg-slate-700 border-slate-500 text-slate-400 cursor-not-allowed opacity-50'
            }`}
          >
            <div className="font-semibold flex items-center justify-between">
              <span>Attack</span>
              <span className={`text-xs px-2 py-1 rounded ${
                getActionStatus('attack') === 'available' ? 'bg-green-600' : 'bg-red-600'
              }`}>
                {getActionStatus('attack') === 'available' ? 'READY' : 'UNAVAILABLE'}
              </span>
            </div>
            <div className="text-sm opacity-80 mt-1">
              {getActionDescription('attack')}
            </div>
          </button>

          {/* Abilities */}
          {abilities.map((ability) => {
            const canUse = canUseAbility(unit, ability.id)
            const cooldownRemaining = unit.abilityCooldowns?.[ability.id] || 0
            
            return (
              <button
                key={ability.id}
                data-action={ability.id}
                onClick={() => handleActionClick(ability.id)}
                disabled={!canUse}
                className={`w-full text-left p-4 border rounded-lg transition-all duration-200 ${
                  canUse 
                    ? 'bg-amber-600 hover:bg-amber-700 border-amber-500 text-white hover:shadow-lg' 
                    : 'bg-slate-700 border-slate-500 text-slate-400 cursor-not-allowed'
                }`}
              >
                <div className="font-semibold flex items-center justify-between">
                  <span>{ability.name}</span>
                  <span className={`text-xs px-2 py-1 rounded ${
                    getActionStatus(ability.id) === 'available' ? 'bg-green-600' : 'bg-red-600'
                  }`}>
                    {getActionStatus(ability.id) === 'available' ? 'READY' : 'UNAVAILABLE'}
                  </span>
                </div>
                <div className="text-sm opacity-80 mt-1">
                  {getActionDescription(ability.id)}
                </div>
                {ability.cooldown > 0 && cooldownRemaining > 0 && (
                  <div className="text-xs text-red-400 mt-1 font-semibold">
                    ⏰ Cooldown: {cooldownRemaining} turns remaining
                  </div>
                )}
                {ability.cooldown > 0 && cooldownRemaining === 0 && (
                  <div className="text-xs text-amber-400 mt-1">
                    ⏰ Cooldown: {ability.cooldown} turns
                  </div>
                )}
                {!canUse && (
                  <div className="text-xs text-red-400 mt-1 font-semibold">
                    {unit.actionsRemaining < ability.cost ? '❌ Not enough AP' : '❌ Out of range or on cooldown'}
                  </div>
                )}
              </button>
            )
          })}

          {/* End Actions */}
          <button
            onClick={handleClose}
            className="w-full text-center p-3 bg-slate-600 hover:bg-slate-700 border border-slate-500 rounded-lg transition-colors duration-200 hover:shadow-lg"
          >
            <div className="font-semibold text-slate-200">Close</div>
          </button>
        </div>
      </div>
    </div>
  )
}