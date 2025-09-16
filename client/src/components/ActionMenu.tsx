import { useGameStore } from '../stores/gameStore'
import { getUnitAbilities, canUseAbility } from '../game/core/abilities.ts'
import { type Unit } from 'shared'
import { UI_CONFIG } from '../config/uiConfig'

interface ActionMenuProps {
  unit: Unit
  position: { x: number; y: number }
  onActionSelect: (action: 'move' | 'attack' | string) => void
  onClose: () => void
}

export function ActionMenu({ unit, position, onActionSelect, onClose }: ActionMenuProps) {
  // Actions don't need selectors as they don't cause re-renders
  const canUnitMove = useGameStore(state => state.canUnitMove)
  const canUnitAttack = useGameStore(state => state.canUnitAttack)
  const getEnemiesInRange = useGameStore(state => state.getEnemiesInRange)
  const abilities = getUnitAbilities(unit)

  // Smart positioning logic - position tooltip to avoid screen edges
  const getTooltipPosition = () => {
    const { x, y } = position
    const tooltipWidth = UI_CONFIG.ACTION_MENU.POSITIONING.MIN_WIDTH
    const tooltipHeight = 200 // Estimate based on content
    const margin = UI_CONFIG.ACTION_MENU.POSITIONING.MARGIN
    
    // Default to bottom-right
    let posX = x + UI_CONFIG.ACTION_MENU.POSITIONING.OFFSET
    let posY = y + UI_CONFIG.ACTION_MENU.POSITIONING.OFFSET
    
    // If too close to right edge, show on left
    if (x + tooltipWidth + margin > window.innerWidth) {
      posX = x - tooltipWidth - UI_CONFIG.ACTION_MENU.POSITIONING.OFFSET
    }
    
    // If too close to bottom edge, show above  
    if (y + tooltipHeight + margin > window.innerHeight) {
      posY = y - tooltipHeight - UI_CONFIG.ACTION_MENU.POSITIONING.OFFSET
    }
    
    return { left: posX, top: posY }
  }

  const tooltipPos = getTooltipPosition()
  
  // Action availability checks (keep existing logic)
  const canMove = canUnitMove(unit)
  const enemiesInRange = getEnemiesInRange(unit)
  const canAttack = canUnitAttack(unit) && enemiesInRange.length > 0

  // Removed handleActionClick and handleEndTurn - now using direct prop calls

  return (
    <div 
      className={`fixed z-50 ${UI_CONFIG.ACTION_MENU.STYLE.BACKGROUND} ${UI_CONFIG.ACTION_MENU.STYLE.BORDER} rounded shadow-lg p-2 min-w-[${UI_CONFIG.ACTION_MENU.POSITIONING.MIN_WIDTH}px]`}
      style={{
        left: tooltipPos.left,
        top: tooltipPos.top,
        fontFamily: UI_CONFIG.ACTION_MENU.FONT.FAMILY,
        fontSize: UI_CONFIG.ACTION_MENU.FONT.SIZE
      }}
    >
      {/* Action Buttons - Simple List */}
      <div className="space-y-1">
        
        {/* Move Button */}
        {canMove && (
          <button
            onClick={() => onActionSelect('move')}
            className={`w-full text-left px-2 py-1 ${UI_CONFIG.ACTION_MENU.STYLE.HOVER} ${UI_CONFIG.ACTION_MENU.STYLE.TEXT} font-medium`}
          >
            Move
          </button>
        )}
        
        {/* Attack Button */}
        {canAttack && (
          <button
            onClick={() => onActionSelect('attack')}
            className={`w-full text-left px-2 py-1 ${UI_CONFIG.ACTION_MENU.STYLE.HOVER} ${UI_CONFIG.ACTION_MENU.STYLE.TEXT} font-medium`}
          >
            Attack
          </button>
        )}
        
        {/* Ability Buttons */}
        {abilities.map((ability) => {
          const canUse = canUseAbility(unit, ability.id)
          if (!canUse) return null
          
          return (
            <button
              key={ability.id}
              onClick={() => onActionSelect(ability.id)}
              className={`w-full text-left px-2 py-1 ${UI_CONFIG.ACTION_MENU.STYLE.HOVER} ${UI_CONFIG.ACTION_MENU.STYLE.TEXT} font-medium`}
            >
              {ability.name}
            </button>
          )
        })}
        
        {/* Separator Line */}
        <div className={`border-t ${UI_CONFIG.ACTION_MENU.STYLE.SEPARATOR} my-1`}></div>
        
        {/* End Turn Button */}
        <button
          onClick={onClose}
          className={`w-full text-left px-2 py-1 ${UI_CONFIG.ACTION_MENU.STYLE.END_BUTTON} ${UI_CONFIG.ACTION_MENU.STYLE.TEXT} font-medium`}
        >
          End
        </button>
      </div>
    </div>
  )
}