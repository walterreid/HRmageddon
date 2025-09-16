import { useState, useEffect, useCallback } from 'react'
import { useGameStore } from '../stores/gameStore'
import { useUIStore } from '../stores/uiStore'
import { useUnitStore } from '../stores/unitStore'
import { usePlayerStore } from '../stores/playerStore'
import { actionHandlers } from '../stores/actionHandlers'
import { ActionMenu } from './ActionMenu'
import { BottomSheet } from './BottomSheet'
// ABILITIES import removed - now handled by actionHandlers

// Type definitions for window extensions
interface GameScene {
  getTileSize?: () => number
  getBoardOffsetX?: () => number
  getBoardOffsetY?: () => number
  clearActionMode?: () => void
  setActionMode?: (mode: string, ability?: string) => void
  getActionMode?: () => string
}

interface ExtendedWindow extends Window {
  gameScene?: GameScene
}

declare const window: ExtendedWindow

import { HUD_CONFIG } from '../config/hudConfig'

export function GameHUD() {
  // Use selectors to prevent unnecessary re-renders
  const selectedUnit = useUnitStore(state => state.selectedUnit)
  const currentPlayerId = usePlayerStore(state => state.currentPlayerId)
  const players = usePlayerStore(state => state.players)
  const turnNumber = usePlayerStore(state => state.turnNumber)
  
  // Get game store for calculations
  const gameStore = useGameStore()
  
  // UI state from UI store
  const actionMode = useUIStore(state => state.actionMode)
  const selectedAbility = useUIStore(state => state.selectedAbility)
  const actionMenuPosition = useUIStore(state => state.actionMenuPosition)
  
  // Actions don't need selectors as they don't cause re-renders
  const endTurn = useGameStore(state => state.endTurn)
  const getAbilityTargets = useGameStore(state => state.getAbilityTargets)
  const canUnitMove = useGameStore(state => state.canUnitMove)
  const canUnitAttack = useGameStore(state => state.canUnitAttack)
  const getEnemiesInRange = useGameStore(state => state.getEnemiesInRange)

  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  
  // Mobile bottom sheet state
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false)
  const [activeSection, setActiveSection] = useState<'game-status' | 'unit-info' | 'help'>('game-status')
  
  // Desktop unified control panel state
  const [activeTab, setActiveTab] = useState<'status' | 'unit' | 'actions'>('status')

  // Mobile: Auto-open bottom sheet when unit is selected
  useEffect(() => {
    if (selectedUnit) {
      setIsBottomSheetOpen(true)
      setActiveSection('unit-info')
    } else {
      setIsBottomSheetOpen(false)
    }
  }, [selectedUnit])
  
  const isPlayerUnit = selectedUnit && selectedUnit.playerId === 'player1'
  const canControl = selectedUnit && selectedUnit.playerId === 'player1' && selectedUnit.actionsRemaining > 0
  const isPlayerTurn = currentPlayerId === 'player1'

  // Get player references
  const player1 = players.find((p) => p.id === 'player1')
  const player2 = players.find((p) => p.id === 'player2')

  

  // Reset action mode when selected unit changes or when unit has no actions remaining
  useEffect(() => {
    if (!selectedUnit || selectedUnit.actionsRemaining <= 0) {
      console.log('Resetting action mode: no unit selected or no actions remaining')
      actionHandlers.cancelAction()
      
      // Clear action mode in GameScene if available
      const gameScene = (window as ExtendedWindow).gameScene
      if (gameScene && gameScene.clearActionMode) {
        gameScene.clearActionMode()
      }
    }
  }, [selectedUnit])

  // Listen for action completion events from the game store
  useEffect(() => {
    const handleActionCompleted = () => {
      console.log('Action completed, resetting action mode')
      actionHandlers.cancelAction()
      
      // Clear action mode in GameScene if available
      const gameScene = (window as ExtendedWindow).gameScene
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

    if (action === 'move') {
      actionHandlers.enterMoveMode(selectedUnit)
    } else if (action === 'attack') {
      actionHandlers.enterAttackMode(selectedUnit)
    } else {
      // This is an ability
      actionHandlers.enterAbilityMode(selectedUnit, action)
    }

    // Set GameScene action mode with retry mechanism
    const setGameSceneActionMode = (retryCount = 0) => {
      const gameScene = (window as ExtendedWindow).gameScene
      
      if (gameScene && gameScene.setActionMode) {
        if (action !== 'move' && action !== 'attack') {
          gameScene.setActionMode('ability', action)
        } else {
          gameScene.setActionMode(action)
        }
      } else if (retryCount < 3) {
        // Retry after a short delay if GameScene isn't ready yet
        setTimeout(() => setGameSceneActionMode(retryCount + 1), 100)
      } else {
        console.log('GameScene not available after retries, action mode set locally only')
      }
    }
    
    setGameSceneActionMode()
    
    // Immediately hide the action menu after action selection
    useUIStore.getState().setActionMenu(null)
  }

  // Handle tile clicks for actions
  const handleTileClick = useCallback((coord: { x: number, y: number }) => {
    if (!selectedUnit || !canControl) return

    console.log('Tile clicked:', coord, 'Action mode:', actionMode)

    // Calculate possible moves and targets inside the callback
    const possibleMoves = gameStore.calculatePossibleMoves(selectedUnit)
    const possibleTargets = gameStore.calculatePossibleTargets(selectedUnit)

    switch (actionMode) {
      case 'move': {
        // Check if this is a valid move
        const isValidMove = possibleMoves.some((move) => move.x === coord.x && move.y === coord.y)
        if (isValidMove) {
          console.log('Executing move to:', coord)
          actionHandlers.executeMove(selectedUnit, coord)
          
          // Clear action mode in game scene
          const gameScene = (window as ExtendedWindow).gameScene
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
      }

      case 'attack': {
        // Check if this tile has a valid attack target
        const isValidTarget = possibleTargets.some((target) => target.x === coord.x && target.y === coord.y)
        const targetUnit = useUnitStore.getState().units.find((u) => 
          u.position.x === coord.x && 
          u.position.y === coord.y && 
          u.playerId !== selectedUnit.playerId
        )
        
        if (isValidTarget && targetUnit) {
          console.log('Executing attack on:', targetUnit.id)
          actionHandlers.executeAttack(selectedUnit, targetUnit)
          
          // Clear action mode in game scene
          const gameScene = (window as ExtendedWindow).gameScene
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
      }

      case 'ability': {
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
            actionHandlers.executeAbility(selectedUnit, selectedAbility, clickedTarget)
            
            // Clear action mode in game scene
            const gameScene = (window as ExtendedWindow).gameScene
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
  }, [selectedUnit, canControl, actionMode, selectedAbility, getAbilityTargets, gameStore])

  // Listen for tile clicks from the game scene
  useEffect(() => {
    const handleGameTileClick = (event: CustomEvent) => {
      const { coord } = event.detail
      handleTileClick(coord)
    }

    const handleAbilityUsed = (event: CustomEvent) => {
      console.log('Ability used:', event.detail?.abilityId)
      actionHandlers.cancelAction()
      setActionFeedback({ type: 'success', message: 'Ability used successfully!' })
      setTimeout(() => setActionFeedback(null), HUD_CONFIG.FEEDBACK.DURATION)
    }

    const handleAbilityCancelled = () => {
      console.log('Ability cancelled')
      actionHandlers.cancelAction()
      setActionFeedback({ type: 'error', message: 'Ability cancelled - invalid target' })
      setTimeout(() => setActionFeedback(null), HUD_CONFIG.FEEDBACK.DURATION)
    }

    window.addEventListener('gameTileClick', handleGameTileClick as EventListener)
    window.addEventListener('abilityUsed', handleAbilityUsed as EventListener)
    window.addEventListener('abilityCancelled', handleAbilityCancelled as EventListener)
    
    return () => {
      window.removeEventListener('gameTileClick', handleGameTileClick as EventListener)
      window.removeEventListener('abilityUsed', handleAbilityUsed as EventListener)
      window.removeEventListener('abilityCancelled', handleAbilityCancelled as EventListener)
    }
  }, [selectedUnit, actionMode, selectedAbility, canControl, handleTileClick])

  // Listen for unit selection blocked events
  useEffect(() => {
    const handleUnitSelectionBlocked = () => {
      setActionFeedback({ 
        type: 'error', 
        message: 'Complete or cancel current action before selecting other units' 
      })
      setTimeout(() => {
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
      const gameScene = (window as ExtendedWindow).gameScene
      if (gameScene && gameScene.getActionMode) {
        const sceneActionMode = gameScene.getActionMode()
        // Validate the action mode from the scene
        if (sceneActionMode === 'move' || sceneActionMode === 'attack' || sceneActionMode === 'ability' || sceneActionMode === 'none') {
          if (sceneActionMode !== actionMode) {
            const uiStore = useUIStore.getState()
            uiStore.setActionMode(sceneActionMode)
            if (sceneActionMode === 'none') {
              uiStore.setSelectedAbility(undefined)
            }
          }
        } else {
          console.warn('Invalid action mode from GameScene:', sceneActionMode, '- resetting to none')
          actionHandlers.cancelAction()
          if (gameScene?.clearActionMode) {
            gameScene.clearActionMode()
          }
        }
      }
    }

    // Check immediately
    checkGameScene()
    
    // Check periodically until GameScene is available
    const interval = setInterval(checkGameScene, HUD_CONFIG.FEEDBACK.DURATION / 20) // Check every 100ms
    
    return () => clearInterval(interval)
  }, [actionMode])

  // Mobile: Open bottom sheet when unit is selected
  useEffect(() => {
    if (selectedUnit) {
      setIsBottomSheetOpen(true)
      setActiveSection('unit-info')
    } else {
      setIsBottomSheetOpen(false)
    }
  }, [selectedUnit])

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

      {/* Mobile Layout: Bottom Sheet */}
      <div className="lg:hidden">
        {/* Mobile Game Status Bar - Always Visible */}
        <div className="fixed top-16 left-0 right-0 bg-slate-800 border-b border-slate-700 p-3 z-30">
          <div className="flex items-center justify-between">
            {/* Turn Info */}
            <div className="flex items-center space-x-3">
              <div className="text-sm font-semibold">Turn {turnNumber}</div>
              <div className={`px-2 py-1 rounded text-xs font-medium ${
                isPlayerTurn ? 'bg-amber-600 text-white' : 'bg-stone-600 text-white'
              }`}>
                {isPlayerTurn ? 'Your Turn' : 'AI Turn'}
              </div>
            </div>
            
            {/* Cubicle Count */}
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-amber-400">Gold: {player1?.controlledCubicles || 0}</span>
              <span className="text-blue-400">Navy: {player2?.controlledCubicles || 0}</span>
            </div>
            
            {/* End Turn Button */}
            {isPlayerTurn && (
              <button
                onClick={endTurn}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors"
              >
                End Turn
              </button>
            )}
            
            {/* Toggle Bottom Sheet Button */}
            <button
              onClick={() => setIsBottomSheetOpen(!isBottomSheetOpen)}
              className="px-3 py-1 bg-slate-600 hover:bg-slate-700 text-white text-xs font-medium rounded transition-colors"
            >
              {isBottomSheetOpen ? 'Hide' : 'Show'} Info
            </button>
          </div>
        </div>

        {/* Bottom Sheet for Game Info */}
        <BottomSheet
          isOpen={isBottomSheetOpen}
          onClose={() => setIsBottomSheetOpen(false)}
          title="Game Information"
          snapPoints={[200, 400, 600]}
          initialSnapPoint={1}
        >
          {/* Section Navigation */}
          <div className="flex space-x-2 mb-4">
            <button
              onClick={() => setActiveSection('game-status')}
              className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                activeSection === 'game-status' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Status
            </button>
            <button
              onClick={() => setActiveSection('unit-info')}
              className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                activeSection === 'unit-info' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Unit
            </button>
            <button
              onClick={() => setActiveSection('help')}
              className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                activeSection === 'help' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Help
            </button>
          </div>

          {/* Game Status Section */}
          {activeSection === 'game-status' && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-xl font-bold mb-2">Turn {turnNumber}</div>
                <div className={`px-4 py-2 rounded-lg text-white font-semibold ${isPlayerTurn ? 'bg-amber-600' : 'bg-stone-600'}`}>
                  {isPlayerTurn ? 'Your Turn' : 'AI Turn'}
                </div>
              </div>

              {/* Player Resources */}
              <div className="space-y-3">
                <h3 className="text-md font-semibold text-center">Resources</h3>
                
                {/* Player 1 (Gold) */}
                <div className="bg-amber-900/20 border border-amber-700 rounded-lg p-3">
                  <div className="text-amber-400 font-semibold text-sm">Gold Team (You)</div>
                  <div className="text-xs space-y-1 mt-2 text-amber-300">
                    <div>Budget: ${player1?.budget || 0}</div>
                    <div>Income: +${player1?.income || 0}/turn</div>
                    <div>Cubicles: {player1?.controlledCubicles || 0}</div>
                  </div>
                </div>

                {/* Player 2 (Navy) */}
                <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3">
                  <div className="text-blue-400 font-semibold text-sm">Navy Team (AI)</div>
                  <div className="text-xs space-y-1 mt-2 text-blue-300">
                    <div>Budget: ${player2?.budget || 0}</div>
                    <div>Income: +${player2?.income || 0}/turn</div>
                    <div>Cubicles: {player2?.controlledCubicles || 0}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Unit Info Section */}
          {activeSection === 'unit-info' && selectedUnit && (
            <div className="space-y-4">
              {/* Unit Info Header */}
              <div className="border-b border-slate-600 pb-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-amber-400 capitalize">
                    {selectedUnit.type.replace('_', ' ')}
                  </h3>
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${isPlayerUnit ? 'bg-amber-500' : 'bg-stone-500'}`} />
                    <span className="text-xs text-slate-400">
                      {isPlayerUnit ? 'Player' : 'Enemy'}
                    </span>
                  </div>
                </div>
                
                {canControl && (
                  <div className="text-xs text-green-400 mt-1">
                    Controlling - {selectedUnit.actionsRemaining} action{selectedUnit.actionsRemaining !== 1 ? 's' : ''} remaining
                  </div>
                )}
              </div>

              {/* Unit Stats */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">HP:</span>
                  <span className="text-white">{selectedUnit.hp}/{selectedUnit.maxHp}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Actions:</span>
                  <span className="text-white">{selectedUnit.actionsRemaining}/{selectedUnit.maxActions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Move Range:</span>
                  <span className="text-white">{selectedUnit.moveRange}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Attack Range:</span>
                  <span className="text-white">{selectedUnit.attackRange}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Attack Damage:</span>
                  <span className="text-white">{selectedUnit.attackDamage}</span>
                </div>
              </div>
            </div>
          )}

          {/* Help Section */}
          {activeSection === 'help' && (
            <div className="space-y-3 text-sm">
              <h3 className="text-lg font-bold text-center">How to Play</h3>
              <div className="space-y-2 text-slate-300">
                <div>• Click any unit to view their stats</div>
                <div>• Click player units (gold) to control them</div>
                <div>• Click highlighted tiles to move/attack</div>
                <div>• Select abilities to use them on targets</div>
                <div>• Capture cubicles to increase income</div>
                <div>• End turn when you're done</div>
              </div>
            </div>
          )}
        </BottomSheet>
      </div>

      {/* Desktop Layout: Flash Game Unified Control Panel */}
      <div className="hidden lg:block">
        <div className="h-full bg-slate-800 border-l-2 border-slate-700 flex flex-col">
          {/* Tab Navigation */}
          <div className="flex border-b border-slate-700 bg-slate-900">
            <button 
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors cursor-pointer border-r border-slate-700 hover:bg-slate-800 ${
                activeTab === 'status' ? 'bg-slate-700 text-blue-400 border-b-2 border-blue-400' : 'text-slate-300'
              }`}
              onClick={() => setActiveTab('status')}
            >
              Game Status
            </button>
            <button 
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors cursor-pointer border-r border-slate-700 hover:bg-slate-800 ${
                activeTab === 'unit' ? 'bg-slate-700 text-blue-400 border-b-2 border-blue-400' : 'text-slate-300'
              }`}
              onClick={() => setActiveTab('unit')}
            >
              Unit Info
            </button>
            <button 
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors cursor-pointer hover:bg-slate-800 ${
                activeTab === 'actions' ? 'bg-slate-700 text-blue-400 border-b-2 border-blue-400' : 'text-slate-300'
              }`}
              onClick={() => setActiveTab('actions')}
            >
              Actions
            </button>
          </div>
          
          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Game Status Tab */}
            {activeTab === 'status' && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-center text-slate-100">Game Status</h2>
                <div className="text-center">
                  <div className="text-2xl font-bold mb-2 text-slate-100">Turn {turnNumber}</div>
                  <div className={`px-4 py-2 rounded-lg text-white font-semibold ${isPlayerTurn ? 'bg-amber-600' : 'bg-stone-600'}`}>
                    {isPlayerTurn ? 'Your Turn (Gold)' : 'AI Turn (Navy)'}
                  </div>
                </div>

                {/* Player Resources */}
                <div className="space-y-3">
                  <h3 className="text-md font-semibold text-center text-slate-200">Resources</h3>
                  
                  {/* Player 1 (Gold) */}
                  <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-3">
                    <div className="text-blue-300 font-semibold text-sm">Gold Team (You)</div>
                    <div className="text-xs space-y-1 mt-2 text-slate-300">
                      <div>Budget: ${player1?.budget || 0}</div>
                      <div>Income: +${player1?.income || 0}/turn</div>
                      <div>Cubicles: {player1?.controlledCubicles || 0}</div>
                    </div>
                  </div>

                  {/* Player 2 (Navy) */}
                  <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-3">
                    <div className="text-red-300 font-semibold text-sm">Navy Team (AI)</div>
                    <div className="text-xs space-y-1 mt-2 text-slate-300">
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
            )}

            {/* Unit Info Tab */}
            {activeTab === 'unit' && (
              <div className="space-y-4">
                {selectedUnit ? (
                  <>
                    <h2 className="text-lg font-bold text-center text-slate-100">Unit Information</h2>
                    
                    {/* Unit Header */}
                    <div className="border-b border-slate-600 pb-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-blue-400 capitalize">
                          {selectedUnit.type.replace('_', ' ')}
                        </h3>
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${isPlayerUnit ? 'bg-amber-500' : 'bg-stone-500'}`} />
                          <span className="text-xs text-slate-400">
                            {isPlayerUnit ? 'Player' : 'Enemy'}
                          </span>
                        </div>
                      </div>
                      
                      {/* Control indicator */}
                      {canControl ? (
                        <div className="text-xs text-green-400 mt-1">
                          Controlling - {selectedUnit.actionsRemaining} action{selectedUnit.actionsRemaining !== 1 ? 's' : ''} remaining
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400 mt-1">
                          Viewing
                        </div>
                      )}
                    </div>

                    {/* Unit Stats */}
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">HP:</span>
                        <span className="text-white">{selectedUnit.hp}/{selectedUnit.maxHp}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Actions:</span>
                        <span className="text-white">{selectedUnit.actionsRemaining}/{selectedUnit.maxActions}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Move Range:</span>
                        <span className="text-white">{selectedUnit.moveRange}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Attack Range:</span>
                        <span className="text-white">{selectedUnit.attackRange}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Attack Damage:</span>
                        <span className="text-white">{selectedUnit.attackDamage}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center text-slate-400 py-8">
                    <p>No unit selected</p>
                    <p className="text-sm mt-2">Click on a unit to view its information</p>
                  </div>
                )}
              </div>
            )}

            {/* Actions Tab */}
            {activeTab === 'actions' && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-center text-slate-100">Available Actions</h2>
                
                {selectedUnit && canControl ? (
                  <div className="space-y-3">
                    {/* Basic Actions */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-blue-400 border-b border-slate-600 pb-1">
                        Basic Actions
                      </h4>
                      
                      <div className="grid grid-cols-2 gap-2">
                        {canUnitMove(selectedUnit) && (
                          <button
                            onClick={() => handleActionSelect('move')}
                            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors"
                          >
                            Move
                          </button>
                        )}
                        
                        {canUnitAttack(selectedUnit) && getEnemiesInRange(selectedUnit).length > 0 && (
                          <button
                            onClick={() => handleActionSelect('attack')}
                            className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded transition-colors"
                          >
                            Attack
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Action Menu Instructions */}
                    <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-3">
                      <div className="text-blue-300 font-semibold text-sm mb-2">
                        Action Menu Available
                      </div>
                      <div className="text-xs text-blue-200">
                        The action menu will appear when you select an action above, or you can use the floating action menu that appears on the game board.
                      </div>
                    </div>

                    {/* Action Menu Instructions */}
                    <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-3">
                      <div className="text-blue-300 font-semibold text-sm mb-2">
                        Action Menu Available
                      </div>
                      <div className="text-xs text-blue-200">
                        The action menu will appear when you select an action above, or you can use the floating action menu that appears on the game board.
                      </div>
                    </div>

                    {/* Action Mode Display */}
                    {actionMode !== 'none' && (
                      <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-3">
                        <div className="text-yellow-300 font-semibold text-sm">
                          Current Mode: {actionMode.toUpperCase()}
                          {selectedAbility && ` - ${selectedAbility.replace('_', ' ')}`}
                        </div>
                        <div className="text-xs text-slate-300 mt-1">
                          {actionMode === 'move' && 'Click a highlighted tile to move'}
                          {actionMode === 'attack' && 'Click an enemy to attack'}
                          {actionMode === 'ability' && selectedAbility && `Select a target for ${selectedAbility.replace('_', ' ')}`}
                        </div>
                        <button
                          onClick={() => {
                            actionHandlers.cancelAction()
                            const gameScene = (window as ExtendedWindow).gameScene
                            if (gameScene && gameScene.clearActionMode) {
                              gameScene.clearActionMode()
                            }
                          }}
                          className="mt-2 px-3 py-1 bg-slate-600 hover:bg-slate-700 text-white text-xs rounded transition-colors"
                        >
                          Cancel Action
                        </button>
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
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-slate-400 py-8">
                    <p>No unit selected or unit cannot be controlled</p>
                    <p className="text-sm mt-2">Select a player unit to see available actions</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Menu Modal - Show on both mobile and desktop when needed */}
      {actionMenuPosition && actionMenuPosition.isVisible && selectedUnit && (
        <>
          {console.log('Rendering ActionMenu with:', { actionMenuPosition, selectedUnit })}
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