import { useEffect, useState, useMemo } from 'react'
import { useGameStore } from '../stores/gameStore'
import { ActionMenu } from './ActionMenu'

export function GameHUD() {
  const {
    players,
    selectedUnit,
    viewingUnit,
    endTurn,
    selectUnit,
    currentPlayerId,
    turnNumber,
    possibleMoves,
    possibleTargets
  } = useGameStore()

  const [actionMenuPosition, setActionMenuPosition] = useState({ x: 0, y: 0 })
  
  const isPlayerUnit = selectedUnit && selectedUnit.playerId === 'player1'
  const canControl = selectedUnit && selectedUnit.playerId === 'player1' && selectedUnit.actionsRemaining > 0
  const isPlayerTurn = currentPlayerId === 'player1'

  // Show action menu when a player unit is selected and can be controlled
  const showActionMenu = useMemo(() => {
    if (!selectedUnit || viewingUnit) return false
    
    // Show action menu for player units that can be controlled
    // Only hide it when we're sure an action mode is active
    const gameScene = (window as any).gameScene
    if (gameScene && gameScene.getActionMode && typeof gameScene.getActionMode === 'function') {
      try {
        const actionMode = gameScene.getActionMode()
        if (actionMode && actionMode !== 'none') {
          console.log('Action menu hidden: action mode is', actionMode)
          return false
        }
      } catch (error) {
        console.log('Error getting action mode:', error)
        // If we can't get the action mode, assume it's 'none' and show the menu
      }
    }
    
    const shouldShow = isPlayerUnit && canControl
    console.log('Action menu check:', { 
      selectedUnit: !!selectedUnit, 
      viewingUnit, 
      isPlayerUnit, 
      canControl, 
      shouldShow,
      gameScene: !!gameScene,
      hasGetActionMode: !!(gameScene && gameScene.getActionMode),
      actionMode: gameScene?.getActionMode?.()
    })
    return shouldShow
  }, [selectedUnit, viewingUnit, isPlayerUnit, canControl])
  
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

  const handleActionSelect = (action: string) => {
    console.log('handleActionSelect called with action:', action)
    if (!selectedUnit) {
      console.log('No selected unit, returning')
      return;
    }

    const gameScene = (window as any).gameScene
    if (!gameScene) {
      console.log('GameScene not available, returning')
      return;
    }

    console.log('Setting action mode to:', action)
    switch (action) {
      case 'move':
        gameScene.setActionMode('move');
        console.log('Move action mode set')
        // The action menu will be hidden by the showActionMenu condition
        // The unit remains selected to show movement tiles
        break;
      case 'attack':
        gameScene.setActionMode('attack');
        console.log('Attack action mode set')
        // The action menu will be hidden by the showActionMenu condition
        // The unit remains selected to show attack targets
        break;
      case 'ability':
        gameScene.setActionMode('ability');
        console.log('Ability action mode set')
        // The action menu will be hidden by the showActionMenu condition
        // The unit remains selected to show ability targets
        break;
      case 'view':
        console.log('View action selected')
        // For view action, we might want to keep the unit selected but not show action menu
        break;
      default:
        console.log('Unknown action:', action)
        break;
    }
  }

  return (
    <>
      {/* Game Status - Top Left */}
      <div className="fixed top-4 left-4 w-80 bg-slate-800/90 backdrop-blur-sm border border-slate-600 rounded-lg p-4 text-slate-100 space-y-4">
        <h2 className="text-lg font-bold text-center">Game Status</h2>
        <div className="text-center">
          <div className="text-2xl font-bold mb-2">Turn {turnNumber}</div>
          <div className={`px-4 py-2 rounded-lg text-white font-semibold ${isPlayerTurn ? 'bg-blue-600' : 'bg-red-600'}`}>
            {isPlayerTurn ? 'Your Turn (Blue)' : 'AI Turn (Red)'}
          </div>
        </div>

        {/* Player Resources */}
        <div className="space-y-3">
          <h3 className="text-md font-semibold text-center">Resources</h3>
          
          {/* Player 1 (Blue) */}
          <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3">
            <div className="text-blue-300 font-semibold text-sm">Blue Team (You)</div>
            <div className="text-xs space-y-1 mt-2">
              <div>Budget: ${player1?.budget || 0}</div>
              <div>Income: +${player1?.income || 0}/turn</div>
              <div>Cubicles: {player1?.controlledCubicles || 0}</div>
            </div>
          </div>

          {/* Player 2 (Red) */}
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-3">
            <div className="text-red-300 font-semibold text-sm">Red Team (AI)</div>
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
              <h3 className="text-lg font-bold text-blue-400 capitalize">
                {selectedUnit.type.replace('_', ' ')}
              </h3>
              <div className="flex items-center space-x-2">
                {/* Player indicator */}
                <div className={`w-3 h-3 rounded-full ${isPlayerUnit ? 'bg-blue-500' : 'bg-red-500'}`} />
                <span className="text-xs text-slate-400">
                  {isPlayerUnit ? 'Player' : 'Enemy'}
                </span>
              </div>
            </div>
            
            {/* Viewing/Control indicator */}
            {viewingUnit && (
              <div className="text-xs text-yellow-400 mt-1">
                📖 Viewing Only
              </div>
            )}
            {!viewingUnit && canControl && (
              <div className="text-xs text-green-400 mt-1">
                🎮 Controlling - {selectedUnit.actionsRemaining} action{selectedUnit.actionsRemaining !== 1 ? 's' : ''} remaining
              </div>
            )}
            {!viewingUnit && !canControl && (
              <div className="text-xs text-gray-400 mt-1">
                ⏸️ No Actions
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
              <h4 className="text-sm font-semibold text-blue-300">Available Actions</h4>
              <div className="text-xs space-y-1">
                <div className="text-slate-300">
                  Moves: {possibleMoves.length} available
                </div>
                <div className="text-slate-300">
                  Targets: {possibleTargets.length} available
                </div>
              </div>
            </div>
          )}

          {/* Help Text */}
          <div className="text-xs text-slate-400 space-y-1 pt-2 border-t border-slate-600">
            <div>• Click any unit to view their stats</div>
            <div>• Click player units (blue) to control them</div>
            <div>• Click highlighted tiles to move/attack</div>
            <div>• Select abilities to use them on targets</div>
            <div>• Capture cubicles to increase income</div>
            <div>• End turn when you're done</div>
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
          />
        </>
      )}
    </>
  )
}


