import { useEffect, useState, useMemo } from 'react'
import { useGameStore } from '../stores/gameStore'
import { ActionMenu } from './ActionMenu'

// Import UI config from ActionMenu for shared constants
import { UI_CONFIG } from '../config/uiConfig'

import { HUD_CONFIG } from '../config/hudConfig'

// Helper function to get action mode styles with fallback
function getActionModeStyles(actionMode: string) {
  const upperActionMode = actionMode.toUpperCase() as keyof typeof HUD_CONFIG.COLORS.ACTION_MODES
  
  // Check if the action mode exists in our config
  if (HUD_CONFIG.COLORS.ACTION_MODES[upperActionMode]) {
    return HUD_CONFIG.COLORS.ACTION_MODES[upperActionMode]
  }
  
  // Fallback to ability mode for unknown action modes (like ability names)
  console.warn(`Unknown action mode: ${actionMode}, falling back to ability mode`)
  return HUD_CONFIG.COLORS.ACTION_MODES.ABILITY
}

export function GameHUD() {
  const {
    players,
    selectedUnit,
    endTurn,
    currentPlayerId,
    turnNumber,
    possibleMoves,
    possibleTargets,
    moveUnit,
    attackTarget,
    useAbility,
    getAbilityTargets,
    selectAbility
  } = useGameStore()

  const [actionMenuPosition, setActionMenuPosition] = useState({ x: 0, y: 0 })
  const [actionMode, setActionMode] = useState<'none' | 'move' | 'attack' | 'ability'>('none')
  const [selectedAbility, setSelectedAbility] = useState<string | null>(null)
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const [unitSelectionBlocked, setUnitSelectionBlocked] = useState(false)
  
  const isPlayerUnit = selectedUnit && selectedUnit.playerId === 'player1'
  const canControl = selectedUnit && selectedUnit.playerId === 'player1' && selectedUnit.actionsRemaining > 0
  const isPlayerTurn = currentPlayerId === 'player1'

  // Show action menu when a player unit is selected and can be controlled
  // Hide it when we're in an action mode OR when the unit has no actions remaining
  const showActionMenu = useMemo(() => {
    if (!selectedUnit) return false
    
    // Hide action menu when in action mode
    if (actionMode !== 'none') {
      console.log('Action menu hidden: action mode is', actionMode)
      return false
    }
    
    // Hide action menu when unit has no actions remaining
    if (selectedUnit.actionsRemaining <= 0) {
      console.log('Action menu hidden: unit has no actions remaining')
      return false
    }
    
    const shouldShow = isPlayerUnit && canControl
    console.log('Action menu check:', { 
      selectedUnit: !!selectedUnit, 
      isPlayerUnit, 
      canControl, 
      shouldShow,
      actionMode,
      actionsRemaining: selectedUnit.actionsRemaining
    })
    return shouldShow
  }, [selectedUnit, isPlayerUnit, canControl, actionMode])
  
  const player1 = players.find((p) => p.id === 'player1')
  const player2 = players.find((p) => p.id === 'player2')

  // Update action menu position when unit is selected
  useEffect(() => {
    if (selectedUnit && isPlayerUnit) {
      // Get the actual tile size and board offset from the game scene
      const gameScene = (window as any).gameScene
      if (gameScene && gameScene.getTileSize && gameScene.getBoardOffsetX && gameScene.getBoardOffsetY) {
        const tileSize = gameScene.getTileSize()
        const boardOffsetX = gameScene.getBoardOffsetX()
        const boardOffsetY = gameScene.getBoardOffsetY()
        
        // Calculate unit position on screen
        const unitScreenX = boardOffsetX + (selectedUnit.position.x * tileSize) + (tileSize / 2)
        const unitScreenY = boardOffsetY + (selectedUnit.position.y * tileSize) + (tileSize / 2)
        
        // Ensure the menu is visible on screen and positioned nicely
        const menuWidth = UI_CONFIG.MENU.WIDTH
        const menuHeight = UI_CONFIG.MENU.HEIGHT
        
        // Position menu to the right of the unit, or above if not enough space
        let x = unitScreenX + UI_CONFIG.MENU.OFFSET_X
        let y = unitScreenY - (menuHeight / 2)
        
        // If menu would go off the right side, position it to the left
        if (x + menuWidth > window.innerWidth - UI_CONFIG.MENU.MIN_MARGIN) {
          x = unitScreenX - menuWidth - UI_CONFIG.MENU.OFFSET_X
        }
        
        // If menu would go off the bottom, position it above
        if (y + menuHeight > window.innerHeight - UI_CONFIG.MENU.MIN_MARGIN) {
          y = window.innerHeight - menuHeight - UI_CONFIG.MENU.MIN_MARGIN
        }
        
        // Ensure menu doesn't go off the left or top
        x = Math.max(UI_CONFIG.MENU.MIN_MARGIN, x)
        y = Math.max(UI_CONFIG.MENU.MIN_MARGIN, y)
        
        console.log('Action menu positioning:', {
          unitPosition: selectedUnit.position,
          tileSize,
          boardOffset: { x: boardOffsetX, y: boardOffsetY },
          unitScreenPos: { x: unitScreenX, y: unitScreenY },
          finalMenuPos: { x, y },
          windowSize: { width: window.innerWidth, height: window.innerHeight }
        })
        
        setActionMenuPosition({ x, y })
      } else {
        console.log('GameScene not available for positioning, using default position')
        // Use a default position when GameScene isn't available
        setActionMenuPosition({ x: UI_CONFIG.MENU.OFFSET_X * 2, y: UI_CONFIG.MENU.OFFSET_Y * 2 })
      }
    }
  }, [selectedUnit, isPlayerUnit])

  // Reset action mode when selected unit changes or when unit has no actions remaining
  useEffect(() => {
    if (!selectedUnit || selectedUnit.actionsRemaining <= 0) {
      console.log('Resetting action mode: no unit selected or no actions remaining')
      setActionMode('none')
      setSelectedAbility(null)
      
      // Clear action mode in GameScene if available
      const gameScene = (window as any).gameScene
      if (gameScene && gameScene.clearActionMode) {
        gameScene.clearActionMode()
      }
    }
  }, [selectedUnit?.id, selectedUnit?.actionsRemaining])

  // Listen for action completion events from the game store
  useEffect(() => {
    const handleActionCompleted = () => {
      console.log('Action completed, resetting action mode')
      setActionMode('none')
      setSelectedAbility(null)
      
      // Clear action mode in GameScene if available
      const gameScene = (window as any).gameScene
      if (gameScene && gameScene.clearActionMode) {
        gameScene.clearActionMode()
      }
    }

    // Listen for custom events when actions complete
    window.addEventListener('actionCompleted', handleActionCompleted)
    
    return () => {
      window.removeEventListener('actionCompleted', handleActionCompleted)
    }
  }, [])

  const handleActionSelect = (action: string) => {
    console.log('handleActionSelect called with action:', action)
    if (!selectedUnit) {
      console.log('No selected unit, returning')
      return;
    }

    if (action === 'move' || action === 'attack') {
      // Clear any ability selection first
      selectAbility('')
      
      // Then set action mode
      setActionMode(action)
      setSelectedAbility(null)
      console.log(`${action} action mode set`)
    } else {
      // This is an ability
      setActionMode('ability')
      setSelectedAbility(action)
      
      // CRITICAL: Set ability in store
      selectAbility(action)
      console.log(`Ability mode set with ability:`, action)
    }

    // Set GameScene action mode
    const gameScene = (window as any).gameScene
    if (gameScene && gameScene.setActionMode) {
      if (action !== 'move' && action !== 'attack') {
        gameScene.setActionMode('ability', action)
      } else {
        gameScene.setActionMode(action)
      }
    } else {
      console.log('GameScene not available, but action mode set locally')
    }
  }

  // Handle tile clicks for actions
  const handleTileClick = (coord: { x: number, y: number }) => {
    if (!selectedUnit || !canControl) return

    console.log('Tile clicked:', coord, 'Action mode:', actionMode)

    switch (actionMode) {
      case 'move':
        // Check if this is a valid move
        const isValidMove = possibleMoves.some(move => move.x === coord.x && move.y === coord.y)
        if (isValidMove) {
          console.log('Executing move to:', coord)
          moveUnit(selectedUnit.id, coord)
          setActionMode('none')
          setSelectedAbility(null)
          
          // Clear action mode in game scene
          const gameScene = (window as any).gameScene
          if (gameScene && gameScene.clearActionMode) {
            gameScene.clearActionMode()
          }
          
          setActionFeedback({ type: 'success', message: 'Unit moved successfully!' })
          setTimeout(() => setActionFeedback(null), HUD_CONFIG.FEEDBACK.DURATION)
        } else {
          setActionFeedback({ type: 'error', message: 'Invalid move location' })
          setTimeout(() => setActionFeedback(null), HUD_CONFIG.FEEDBACK.DURATION)
        }
        break

      case 'attack':
        // Check if this tile has a valid attack target
        const isValidTarget = possibleTargets.some(target => target.x === coord.x && target.y === coord.y)
        const targetUnit = useGameStore.getState().units.find(u => 
          u.position.x === coord.x && 
          u.position.y === coord.y && 
          u.playerId !== selectedUnit.playerId
        )
        
        if (isValidTarget && targetUnit) {
          console.log('Executing attack on:', targetUnit.id)
          attackTarget(selectedUnit.id, targetUnit.id)
          setActionMode('none')
          setSelectedAbility(null)
          
          // Clear action mode in game scene
          const gameScene = (window as any).gameScene
          if (gameScene && gameScene.clearActionMode) {
            gameScene.clearActionMode()
          }
          
          setActionFeedback({ type: 'success', message: 'Attack executed!' })
          setTimeout(() => setActionFeedback(null), HUD_CONFIG.FEEDBACK.DURATION)
        } else {
          setActionFeedback({ type: 'error', message: 'No enemy unit at this location' })
          setTimeout(() => setActionFeedback(null), HUD_CONFIG.FEEDBACK.DURATION)
        }
        break

      case 'ability':
        if (selectedAbility) {
          // Get valid targets for this ability
          const validTargets = getAbilityTargets(selectedUnit.id, selectedAbility)
          const clickedTarget = validTargets.find(target => {
            if ('x' in target) {
              return target.x === coord.x && target.y === coord.y
            } else {
              return target.position.x === coord.x && target.position.y === coord.y
            }
          })

          if (clickedTarget) {
            console.log('Executing ability:', selectedAbility, 'on target:', clickedTarget)
            useAbility(selectedUnit.id, selectedAbility, clickedTarget)
            setActionMode('none')
            setSelectedAbility(null)
            
            // Clear action mode in game scene
            const gameScene = (window as any).gameScene
            if (gameScene && gameScene.clearActionMode) {
              gameScene.clearActionMode()
            }
            
            setActionFeedback({ type: 'success', message: 'Ability used successfully!' })
            setTimeout(() => setActionFeedback(null), HUD_CONFIG.FEEDBACK.DURATION)
          } else {
            setActionFeedback({ type: 'error', message: 'Invalid target for this ability' })
            setTimeout(() => setActionFeedback(null), HUD_CONFIG.FEEDBACK.DURATION)
        }
        }
        break
    }
  }

  // Listen for tile clicks from the game scene
  useEffect(() => {
    const handleGameTileClick = (event: CustomEvent) => {
      const { coord } = event.detail
      handleTileClick(coord)
    }

    window.addEventListener('gameTileClick', handleGameTileClick as EventListener)
    return () => {
      window.removeEventListener('gameTileClick', handleGameTileClick as EventListener)
    }
  }, [selectedUnit, actionMode, selectedAbility, canControl])

  // Listen for unit selection blocked events
  useEffect(() => {
    const handleUnitSelectionBlocked = () => {
      setUnitSelectionBlocked(true)
      setActionFeedback({ 
        type: 'error', 
        message: 'Complete or cancel current action before selecting other units' 
      })
      setTimeout(() => {
        setUnitSelectionBlocked(false)
        setActionFeedback(null)
      }, HUD_CONFIG.FEEDBACK.DURATION * 1.5)
    }

    window.addEventListener('unitSelectionBlocked', handleUnitSelectionBlocked as EventListener)
    return () => {
      window.removeEventListener('unitSelectionBlocked', handleUnitSelectionBlocked as EventListener)
    }
  }, [])

  // Sync action mode with GameScene when it becomes available
  useEffect(() => {
    const checkGameScene = () => {
      const gameScene = (window as any).gameScene
      if (gameScene && gameScene.getActionMode) {
              const sceneActionMode = gameScene.getActionMode()
      // Validate the action mode from the scene
      if (sceneActionMode === 'move' || sceneActionMode === 'attack' || sceneActionMode === 'ability' || sceneActionMode === 'none') {
        if (sceneActionMode !== actionMode) {
          setActionMode(sceneActionMode)
          if (sceneActionMode === 'none') {
            setSelectedAbility(null)
          }
        }
      } else {
        console.warn('Invalid action mode from GameScene:', sceneActionMode, '- resetting to none')
        setActionMode('none')
        setSelectedAbility(null)
        gameScene.clearActionMode()
      }
      }
    }

    // Check immediately
    checkGameScene()
    
    // Check periodically until GameScene is available
    const interval = setInterval(checkGameScene, HUD_CONFIG.FEEDBACK.DURATION / 20) // Check every 100ms
    
    return () => clearInterval(interval)
  }, [actionMode])

  return (
    <>
      {/* Action Feedback Toast */}
      {actionFeedback && (
        <div className={`${HUD_CONFIG.FEEDBACK.POSITION} px-6 py-3 rounded-lg shadow-lg transition-all duration-300 ${
          actionFeedback.type === 'success' 
            ? 'bg-green-600 text-white' 
            : 'bg-red-600 text-white'
        }`}>
          {actionFeedback.message}
        </div>
      )}

      {/* Game Status - Top Left */}
              <div className={`${HUD_CONFIG.PANELS.STATUS.POSITION} ${HUD_CONFIG.PANELS.STATUS.WIDTH} ${HUD_CONFIG.PANELS.STATUS.MAX_HEIGHT} ${HUD_CONFIG.COLORS.PANELS.BACKGROUND} ${HUD_CONFIG.COLORS.PANELS.BORDER} rounded-lg p-4 ${HUD_CONFIG.COLORS.TEXT.PRIMARY} space-y-4`}>
        <h2 className="text-lg font-bold text-center">Game Status</h2>
        <div className="text-center">
          <div className="text-2xl font-bold mb-2">Turn {turnNumber}</div>
          <div className={`px-4 py-2 rounded-lg text-white font-semibold ${isPlayerTurn ? 'bg-amber-600' : 'bg-stone-600'}`}>
            {isPlayerTurn ? HUD_CONFIG.TEXT.TURN_INDICATOR.YOUR_TURN : HUD_CONFIG.TEXT.TURN_INDICATOR.AI_TURN}
          </div>
        </div>

        {/* Player Resources */}
        <div className="space-y-3">
          <h3 className="text-md font-semibold text-center">Resources</h3>
          
          {/* Player 1 (Gold) */}
          <div className={`${HUD_CONFIG.COLORS.TEAMS.PLAYER1.BACKGROUND} border ${HUD_CONFIG.COLORS.TEAMS.PLAYER1.BORDER} rounded-lg p-3`}>
            <div className={`${HUD_CONFIG.COLORS.TEAMS.PLAYER1.TEXT} font-semibold text-sm`}>Gold Team (You)</div>
            <div className="text-xs space-y-1 mt-2">
              <div>Budget: ${player1?.budget || 0}</div>
              <div>Income: +${player1?.income || 0}/turn</div>
              <div>Cubicles: {player1?.controlledCubicles || 0}</div>
            </div>
          </div>

          {/* Player 2 (Navy) */}
          <div className={`${HUD_CONFIG.COLORS.TEAMS.PLAYER2.BACKGROUND} border ${HUD_CONFIG.COLORS.TEAMS.PLAYER2.BORDER} rounded-lg p-3`}>
            <div className={`${HUD_CONFIG.COLORS.TEAMS.PLAYER2.TEXT} font-semibold text-sm`}>Navy Team (AI)</div>
            <div className="text-xs space-y-1 mt-2">
              <div>Budget: ${player2?.budget || 0}</div>
              <div>Income: +${player2?.income || 0}/turn</div>
              <div>Cubicles: {player2?.controlledCubicles || 0}</div>
            </div>
          </div>
        </div>

        {/* End Turn Button */}
        {isPlayerTurn && (
          <div className="text-center">
            <button
              onClick={endTurn}
              className={`w-full px-6 py-3 ${HUD_CONFIG.COLORS.BUTTONS.END_TURN} text-white font-semibold rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl`}
            >
              End Turn
            </button>
            <p className="text-xs text-slate-400 mt-2">
              Pass control to the AI opponent
            </p>
          </div>
        )}
      </div>

      {/* Unit Info - Top Right (Simplified) */}
      {selectedUnit && (
        <div className={`${HUD_CONFIG.PANELS.UNIT_INFO.POSITION} ${HUD_CONFIG.PANELS.UNIT_INFO.WIDTH} ${HUD_CONFIG.PANELS.UNIT_INFO.MAX_HEIGHT} ${HUD_CONFIG.COLORS.PANELS.BACKGROUND} ${HUD_CONFIG.COLORS.PANELS.BORDER} rounded-lg p-4 ${HUD_CONFIG.COLORS.TEXT.PRIMARY} space-y-4 max-h-[calc(100vh-2rem)] overflow-y-auto`}>
          {/* Unit Info Header */}
          <div className={`border-b ${HUD_CONFIG.COLORS.PANELS.BORDER} pb-3`}>
            <div className="flex items-center justify-between">
              <h3 className={`text-lg font-bold ${HUD_CONFIG.COLORS.TEXT.ACCENT} capitalize`}>
                {selectedUnit.type.replace('_', ' ')}
              </h3>
              <div className="flex items-center space-x-2">
                {/* Player indicator */}
                <div className={`w-3 h-3 rounded-full ${isPlayerUnit ? 'bg-amber-500' : 'bg-stone-500'}`} />
                <span className={`text-xs ${HUD_CONFIG.COLORS.TEXT.SECONDARY}`}>
                  {isPlayerUnit ? 'Player' : 'Enemy'}
                </span>
              </div>
            </div>
            
            {/* Control indicator */}
            {canControl ? (
              <div className={`text-xs ${HUD_CONFIG.COLORS.TEXT.SUCCESS} mt-1`}>
                {HUD_CONFIG.TEXT.UNIT_STATUS.CONTROLLING} - {selectedUnit.actionsRemaining} action{selectedUnit.actionsRemaining !== 1 ? 's' : ''} remaining
              </div>
            ) : (
              <div className={`text-xs ${HUD_CONFIG.COLORS.TEXT.SECONDARY} mt-1`}>
                {HUD_CONFIG.TEXT.UNIT_STATUS.VIEWING}
              </div>
            )}
          </div>

          {/* Unit Stats */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className={HUD_CONFIG.COLORS.TEXT.SECONDARY}>HP:</span>
              <span className={HUD_CONFIG.COLORS.TEXT.PRIMARY}>{selectedUnit.hp}/{selectedUnit.maxHp}</span>
            </div>
            <div className="flex justify-between">
              <span className={HUD_CONFIG.COLORS.TEXT.SECONDARY}>Actions:</span>
              <span className={HUD_CONFIG.COLORS.TEXT.PRIMARY}>{selectedUnit.actionsRemaining}/{selectedUnit.maxActions}</span>
            </div>
            <div className="flex justify-between">
              <span className={HUD_CONFIG.COLORS.TEXT.SECONDARY}>Move Range:</span>
              <span className={HUD_CONFIG.COLORS.TEXT.PRIMARY}>{selectedUnit.moveRange}</span>
            </div>
            <div className="flex justify-between">
              <span className={HUD_CONFIG.COLORS.TEXT.PRIMARY}>Attack Range:</span>
              <span className={HUD_CONFIG.COLORS.TEXT.PRIMARY}>{selectedUnit.attackRange}</span>
            </div>
            <div className="flex justify-between">
              <span className={HUD_CONFIG.COLORS.TEXT.SECONDARY}>Attack Damage:</span>
              <span className={HUD_CONFIG.COLORS.TEXT.PRIMARY}>{selectedUnit.attackDamage}</span>
            </div>
          </div>

          {/* Available Actions (only for player units) */}
          {canControl && (
            <div className="space-y-2">
              <h4 className={`text-sm font-semibold ${HUD_CONFIG.COLORS.TEXT.ACCENT}`}>Available Actions</h4>
              <div className="text-xs space-y-1">
                <div className={HUD_CONFIG.COLORS.TEXT.SECONDARY}>
                  Moves: {possibleMoves.length} available
                </div>
                <div className={HUD_CONFIG.COLORS.TEXT.SECONDARY}>
                  Targets: {possibleTargets.length} available
                </div>
              </div>
              
              {/* Move Mode Instructions */}
              {actionMode === 'move' && possibleMoves.length > 0 && (
                <div className={`${HUD_CONFIG.COLORS.ACTION_MODES.MOVE.BACKGROUND} border ${HUD_CONFIG.COLORS.ACTION_MODES.MOVE.BORDER} rounded-lg p-2 mt-2`}>
                  <div className={`${HUD_CONFIG.COLORS.ACTION_MODES.MOVE.TEXT} text-xs font-semibold`}>
                    {HUD_CONFIG.TEXT.ACTION_MODES.MOVE}
                  </div>
                  <div className="text-blue-200 text-xs mt-1">
                    Click on highlighted tiles to move
                  </div>
                  <div className="text-blue-200 text-xs">
                    {possibleMoves.length} move{possibleMoves.length !== 1 ? 's' : ''} available
                  </div>
                </div>
              )}

              {/* Attack Mode Instructions */}
              {actionMode === 'attack' && possibleTargets.length > 0 && (
                <div className={`${HUD_CONFIG.COLORS.ACTION_MODES.ATTACK.BACKGROUND} border ${HUD_CONFIG.COLORS.ACTION_MODES.ATTACK.BORDER} rounded-lg p-2 mt-2`}>
                  <div className={`${HUD_CONFIG.COLORS.ACTION_MODES.ATTACK.TEXT} text-xs font-semibold`}>
                    {HUD_CONFIG.TEXT.ACTION_MODES.ATTACK}
                  </div>
                  <div className="text-red-200 text-xs mt-1">
                    Click on enemy units to attack them
                  </div>
                  <div className="text-red-200 text-xs">
                    {possibleTargets.length} target{possibleTargets.length !== 1 ? 's' : ''} available
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Current Action Mode Display */}
          {actionMode !== 'none' && (
            <div className={`${getActionModeStyles(actionMode).BACKGROUND} border ${getActionModeStyles(actionMode).BORDER} rounded-lg p-3`}>
              <div className={`${getActionModeStyles(actionMode).TEXT} font-semibold text-sm`}>
                Current Mode: {actionMode.toUpperCase()}
                {selectedAbility && ` - ${selectedAbility.replace('_', ' ')}`}
              </div>
              <div className="text-xs text-yellow-200 mt-1">
                {actionMode === 'move' && 'Click a highlighted tile to move'}
                {actionMode === 'attack' && 'Click an enemy to attack'}
                {actionMode === 'ability' && selectedAbility && `Select a target for ${selectedAbility.replace('_', ' ')}`}
              </div>
              <button
                onClick={() => {
                  setActionMode('none')
                  setSelectedAbility(null)
                  const gameScene = (window as any).gameScene
                  if (gameScene && gameScene.clearActionMode) {
                    gameScene.clearActionMode()
                  }
                }}
                className={`mt-2 px-3 py-1 ${HUD_CONFIG.COLORS.BUTTONS.CANCEL} text-white text-xs rounded transition-colors`}
              >
                Cancel Action
              </button>
            </div>
          )}

          {/* Unit Selection Blocked Warning */}
          {unitSelectionBlocked && (
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-3">
              <div className="text-red-300 font-semibold text-sm">
                ⚠️ Unit Selection Blocked
              </div>
              <div className="text-xs text-red-200 mt-1">
                Complete or cancel your current action before selecting other units
              </div>
            </div>
          )}

          {/* Help Text */}
          <div className={`text-xs ${HUD_CONFIG.COLORS.TEXT.SECONDARY} space-y-1 pt-2 border-t ${HUD_CONFIG.COLORS.PANELS.BORDER}`}>
            <div>• Click any unit to view their stats</div>
            <div>• Click player units (gold) to control them</div>
            <div>• Click highlighted tiles to move/attack</div>
            <div>• Select abilities to use them on targets</div>
            <div>• Capture cubicles to increase income</div>
            <div>• End turn when you're done</div>
            {actionMode !== 'none' && (
              <div className={`${HUD_CONFIG.COLORS.TEXT.WARNING} font-semibold`}>
                {UI_CONFIG.TEXT.HEADERS.ACTION_MODE_WARNING}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Menu Modal */}
      {showActionMenu && selectedUnit && (
        <>
          {console.log('Rendering ActionMenu with:', { showActionMenu, selectedUnit, position: actionMenuPosition })}
          <ActionMenu
            unit={selectedUnit}
            position={actionMenuPosition}
            onActionSelect={handleActionSelect}
            onClose={() => {
              // Deselect the unit when closing the action menu
              useGameStore.getState().selectUnit(undefined)
            }}
          />
        </>
      )}
    </>
  )
}