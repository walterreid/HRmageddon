import { useEffect, useState } from 'react'
import { useGameStore } from '../stores/gameStore'
import { useUnitStore } from '../stores/unitStore'
import { usePlayerStore } from '../stores/playerStore'
import { BottomSheet } from './BottomSheet'

export function MobileGameHUD() {
  // Use selectors to prevent unnecessary re-renders
  const players = usePlayerStore(state => state.players)
  const selectedUnit = useUnitStore(state => state.selectedUnit)
  const currentPlayerId = usePlayerStore(state => state.currentPlayerId)
  const turnNumber = usePlayerStore(state => state.turnNumber)
  
  // Actions don't need selectors as they don't cause re-renders
  const endTurn = useGameStore(state => state.endTurn)

  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false)
  const [activeSection, setActiveSection] = useState<'game-status' | 'unit-info' | 'help'>('game-status')
  
  const isPlayerTurn = currentPlayerId === 'player1'
  const player1 = players.find((p) => p.id === 'player1')
  const player2 = players.find((p) => p.id === 'player2')

  // Open bottom sheet when unit is selected
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
      {/* Mobile Game Status Bar - Always Visible */}
      <div className="fixed top-16 left-0 right-0 bg-slate-800 border-b border-slate-700 p-3 z-30 lg:hidden">
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
                  <div className={`w-3 h-3 rounded-full ${selectedUnit.playerId === 'player1' ? 'bg-amber-500' : 'bg-stone-500'}`} />
                  <span className="text-xs text-slate-400">
                    {selectedUnit.playerId === 'player1' ? 'Player' : 'Enemy'}
                  </span>
                </div>
              </div>
              
              {selectedUnit.actionsRemaining > 0 && (
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
    </>
  )
}
