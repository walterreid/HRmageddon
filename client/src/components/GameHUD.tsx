import { useEffect, useState, useMemo } from 'react'
import { useGameStore } from '../stores/gameStore'
import { ActionMenu } from './ActionMenu'

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
    getAbilityTargets
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
        const menuWidth = 350
        const menuHeight = 400
        
        // Position menu to the right of the unit, or above if not enough space
        let x = unitScreenX + 50
        let y = unitScreenY - (menuHeight / 2)
        
        // If menu would go off the right side, position it to the left
        if (x + menuWidth > window.innerWidth - 20) {
          x = unitScreenX - menuWidth - 50
        }
        
        // If menu would go off the bottom, position it above
        if (y + menuHeight > window.innerHeight - 20) {
          y = window.innerHeight - menuHeight - 20
        }
        
        // Ensure menu doesn't go off the left or top
        x = Math.max(20, x)
        y = Math.max(20, y)
        
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
        setActionMenuPosition({ x: 100, y: 100 })
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

    console.log('Setting action mode to:', action)
    setActionMode(action as 'move' | 'attack' | 'ability')

    // Handle ability selection
    if (action !== 'move' && action !== 'attack') {
      setSelectedAbility(action)
      console.log('Selected ability:', action)
    } else {
      setSelectedAbility(null)
    }

    const gameScene = (window as any).gameScene
    if (gameScene && gameScene.setActionMode) {
      if (action === 'ability') {
        // For abilities, pass the action as the ability ID
        gameScene.setActionMode(action, action);
        console.log(`${action} action mode set with ability:`, action)
      } else {
        gameScene.setActionMode(action);
        console.log(`${action} action mode set`)
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
          setTimeout(() => setActionFeedback(null), 2000)
        } else {
          setActionFeedback({ type: 'error', message: 'Invalid move location' })
          setTimeout(() => setActionFeedback(null), 2000)
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
          setTimeout(() => setActionFeedback(null), 2000)
        } else {
          setActionFeedback({ type: 'error', message: 'No enemy unit at this location' })
          setTimeout(() => setActionFeedback(null), 2000)
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
            setTimeout(() => setActionFeedback(null), 2000)
          } else {
            setActionFeedback({ type: 'error', message: 'Invalid target for this ability' })
            setTimeout(() => setActionFeedback(null), 2000)
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
      }, 3000)
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
        if (sceneActionMode !== actionMode) {
          setActionMode(sceneActionMode)
          if (sceneActionMode === 'none') {
            setSelectedAbility(null)
          }
        }
      }
    }

    // Check immediately
    checkGameScene()
    
    // Check periodically until GameScene is available
    const interval = setInterval(checkGameScene, 100)
    
    return () => clearInterval(interval)
  }, [actionMode])

  return (
    <>
      {/* Action Feedback Toast */}
      {actionFeedback && (
        <div className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-lg shadow-lg transition-all duration-300 ${
          actionFeedback.type === 'success' 
            ? 'bg-green-600 text-white' 
            : 'bg-red-600 text-white'
        }`}>
          {actionFeedback.message}
        </div>
      )}

      {/* Game Status - Top Left */}
      <div className="fixed top-4 left-4 w-80 bg-slate-800/90 backdrop-blur-sm border border-slate-600 rounded-lg p-4 text-slate-100 space-y-4">
        <h2 className="text-lg font-bold text-center">Game Status</h2>
        <div className="text-center">
          <div className="text-2xl font-bold mb-2">Turn {turnNumber}</div>
          <div className={`px-4 py-2 rounded-lg text-white font-semibold ${isPlayerTurn ? 'bg-yellow-600' : 'bg-slate-700'}`}>
            {isPlayerTurn ? 'Your Turn (Gold)' : 'AI Turn (Navy)'}
          </div>
        </div>

        {/* Player Resources */}
        <div className="space-y-3">
          <h3 className="text-md font-semibold text-center">Resources</h3>
          
          {/* Player 1 (Gold) */}
          <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-3">
            <div className="text-yellow-300 font-semibold text-sm">Gold Team (You)</div>
            <div className="text-xs space-y-1 mt-2">
              <div>Budget: ${player1?.budget || 0}</div>
              <div>Income: +${player1?.income || 0}/turn</div>
              <div>Cubicles: {player1?.controlledCubicles || 0}</div>
            </div>
          </div>

          {/* Player 2 (Navy) */}
          <div className="bg-slate-900/20 border border-slate-700 rounded-lg p-3">
            <div className="text-slate-300 font-semibold text-sm">Navy Team (AI)</div>
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
              className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl"
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
        <div className="fixed top-4 right-4 w-80 bg-slate-800/90 backdrop-blur-sm border border-slate-600 rounded-lg p-4 text-slate-100 space-y-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
          {/* Unit Info Header */}
          <div className="border-b border-slate-600 pb-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-yellow-400 capitalize">
                {selectedUnit.type.replace('_', ' ')}
              </h3>
              <div className="flex items-center space-x-2">
                {/* Player indicator */}
                <div className={`w-3 h-3 rounded-full ${isPlayerUnit ? 'bg-yellow-500' : 'bg-slate-600'}`} />
                <span className="text-xs text-slate-400">
                  {isPlayerUnit ? 'Player' : 'Enemy'}
                </span>
              </div>
            </div>
            
            {/* Control indicator */}
            {canControl ? (
              <div className="text-xs text-green-400 mt-1">
                🎮 Controlling - {selectedUnit.actionsRemaining} action{selectedUnit.actionsRemaining !== 1 ? 's' : ''} remaining
              </div>
            ) : (
              <div className="text-xs text-gray-400 mt-1">
                📖 Viewing Only
              </div>
            )}
          </div>

          {/* Unit Stats */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-300">HP:</span>
              <span className="text-white">{selectedUnit.hp}/{selectedUnit.maxHp}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-300">Actions:</span>
              <span className="text-white">{selectedUnit.actionsRemaining}/{selectedUnit.maxActions}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-300">Move Range:</span>
              <span className="text-white">{selectedUnit.moveRange}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-300">Attack Range:</span>
              <span className="text-white">{selectedUnit.attackRange}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-300">Attack Damage:</span>
              <span className="text-white">{selectedUnit.attackDamage}</span>
            </div>
          </div>

          {/* Available Actions (only for player units) */}
          {canControl && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-yellow-300">Available Actions</h4>
              <div className="text-xs space-y-1">
                <div className="text-slate-300">
                  Moves: {possibleMoves.length} available
                </div>
                <div className="text-slate-300">
                  Targets: {possibleTargets.length} available
                </div>
              </div>
              
              {/* Move Mode Instructions */}
              {actionMode === 'move' && possibleMoves.length > 0 && (
                <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-2 mt-2">
                  <div className="text-blue-300 text-xs font-semibold">
                    🚶 Move Mode Active
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
                <div className="bg-red-900/20 border border-red-700 rounded-lg p-2 mt-2">
                  <div className="text-red-300 text-xs font-semibold">
                    🎯 Attack Mode Active
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
            <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-3">
              <div className="text-yellow-300 font-semibold text-sm">
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
                className="mt-2 px-3 py-1 bg-slate-600 hover:bg-slate-500 text-white text-xs rounded transition-colors"
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
          <div className="text-xs text-slate-400 space-y-1 pt-2 border-t border-slate-600">
            <div>• Click any unit to view their stats</div>
            <div>• Click player units (gold) to control them</div>
            <div>• Click highlighted tiles to move/attack</div>
            <div>• Select abilities to use them on targets</div>
            <div>• Capture cubicles to increase income</div>
            <div>• End turn when you're done</div>
            {actionMode !== 'none' && (
              <div className="text-amber-400 font-semibold">
                ⚠️ Action mode active - complete or cancel current action first
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