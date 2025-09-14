import { useGameStore } from '../stores/gameStore'
import { getUnitAbilities, canUseAbility } from '../game/core/abilities.ts'
import { type Unit } from 'shared'

// ===== TOOLTIP ACTION MENU CONFIG =====
const TOOLTIP_CONFIG = {
  STYLE: {
    BACKGROUND: 'bg-yellow-200',
    BORDER: 'border-2 border-black',
    TEXT: 'text-black',
    HOVER: 'hover:bg-yellow-300',
    END_BUTTON: 'bg-pink-200 hover:bg-pink-300',
    SEPARATOR: 'border-black',
  },
  POSITIONING: {
    OFFSET: 20,
    MARGIN: 10,
    MIN_WIDTH: 140,
  },
  FONT: {
    FAMILY: 'serif',
    SIZE: '14px',
  }
}
// ===== END CONFIG =====

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
  const abilities = getUnitAbilities(unit.type)

  // Smart positioning logic - position tooltip to avoid screen edges
  const getTooltipPosition = () => {
    const { x, y } = position
    const tooltipWidth = TOOLTIP_CONFIG.POSITIONING.MIN_WIDTH
    const tooltipHeight = 200 // Estimate based on content
    const margin = TOOLTIP_CONFIG.POSITIONING.MARGIN
    
    // Default to bottom-right
    let posX = x + TOOLTIP_CONFIG.POSITIONING.OFFSET
    let posY = y + TOOLTIP_CONFIG.POSITIONING.OFFSET
    
    // If too close to right edge, show on left
    if (x + tooltipWidth + margin > window.innerWidth) {
      posX = x - tooltipWidth - TOOLTIP_CONFIG.POSITIONING.OFFSET
    }
    
    // If too close to bottom edge, show above  
    if (y + tooltipHeight + margin > window.innerHeight) {
      posY = y - tooltipHeight - TOOLTIP_CONFIG.POSITIONING.OFFSET
    }
    
    return { left: posX, top: posY }
  }

  const tooltipPos = getTooltipPosition()
  
  // Action availability checks (keep existing logic)
  const canMove = canUnitMove(unit)
  const enemiesInRange = getEnemiesInRange(unit)
  const canAttack = canUnitAttack(unit) && enemiesInRange.length > 0

  const handleActionClick = (action: 'move' | 'attack' | string) => {
    console.log('ActionMenu: handleActionClick called with action:', action)
    
    // Call the action handler
    onActionSelect(action)
    
    // DO NOT deselect the unit - just let the action mode handle it
    // The GameHUD will hide the action menu when actionMode !== 'none'
  }

  const handleEndTurn = () => {
    console.log('End turn clicked for unit:', unit.id)
    // Mark unit as done and close menu
    onClose()
    // You might want to add logic here to mark unit as "done" visually
  }

  return (
    <div 
      className={`fixed z-50 ${TOOLTIP_CONFIG.STYLE.BACKGROUND} ${TOOLTIP_CONFIG.STYLE.BORDER} rounded shadow-lg p-2 min-w-[${TOOLTIP_CONFIG.POSITIONING.MIN_WIDTH}px]`}
      style={{
        left: tooltipPos.left,
        top: tooltipPos.top,
        fontFamily: TOOLTIP_CONFIG.FONT.FAMILY,
        fontSize: TOOLTIP_CONFIG.FONT.SIZE
      }}
    >
      {/* Action Buttons - Simple List */}
      <div className="space-y-1">
        
        {/* Move Button */}
        {canMove && (
          <button
            onClick={() => handleActionClick('move')}
            className={`w-full text-left px-2 py-1 ${TOOLTIP_CONFIG.STYLE.HOVER} ${TOOLTIP_CONFIG.STYLE.TEXT} font-medium`}
          >
            Move
          </button>
        )}
        
        {/* Attack Button */}
        {canAttack && (
          <button
            onClick={() => handleActionClick('attack')}
            className={`w-full text-left px-2 py-1 ${TOOLTIP_CONFIG.STYLE.HOVER} ${TOOLTIP_CONFIG.STYLE.TEXT} font-medium`}
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
              onClick={() => handleActionClick(ability.id)}
              className={`w-full text-left px-2 py-1 ${TOOLTIP_CONFIG.STYLE.HOVER} ${TOOLTIP_CONFIG.STYLE.TEXT} font-medium`}
            >
              {ability.name}
            </button>
          )
        })}
        
        {/* Separator Line */}
        <div className={`border-t ${TOOLTIP_CONFIG.STYLE.SEPARATOR} my-1`}></div>
        
        {/* End Turn Button */}
        <button
          onClick={handleEndTurn}
          className={`w-full text-left px-2 py-1 ${TOOLTIP_CONFIG.STYLE.END_BUTTON} ${TOOLTIP_CONFIG.STYLE.TEXT} font-medium`}
        >
          End
        </button>
      </div>
    </div>
  )
}